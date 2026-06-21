export interface PinDef { 
  name: string; 
  gpio: number; 
}

export interface ArgDef { 
  type: string; 
  name?: string; 
}

export interface CmdDef { 
  index: number; 
  Cmd: string; 
  args: ArgDef[]; 
  ints?: ArgDef[]; 
  rets?: ArgDef[]; 
}

export interface CompiledResult {
  prog: Uint8Array;
  str: Uint8Array;
  byteMap: Record<string, { start: number; end: number }>;
}

/**
 * Generates a formatted Hex Dump string from a Uint8Array.
 */
export const generateHexDump = (data: Uint8Array, startAddress: number): string => {
  if (!data || data.length === 0) return "No data to display.";
  
  let hexDump = '';
  const BYTES_PER_LINE = 16;
  let currentAddress = startAddress;

  for (let i = 0; i < data.length; i += BYTES_PER_LINE) {
    const chunk = data.slice(i, i + BYTES_PER_LINE);
    const addressStr = currentAddress.toString(16).padStart(8, '0').toUpperCase();
    
    const hexParts = Array.from(chunk).map(byte => byte.toString(16).padStart(2, '0').toUpperCase());
    const hexString = hexParts.join(' ').padEnd(BYTES_PER_LINE * 3 - 1, ' ');
    
    const asciiString = Array.from(chunk).map(byte => (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.').join('');

    hexDump += `${addressStr}  ${hexString}  |${asciiString}|\n`;
    currentAddress += BYTES_PER_LINE;
  }
  return hexDump.trimEnd();
};

/**
 * Recursively extracts all 'command' strings from the JSON object.
 */
export const extractCommands = (obj: any): string[] => {
  let commands: string[] = [];
  if (obj !== null && typeof obj === 'object') {
    if (Array.isArray(obj)) {
      obj.forEach(item => commands.push(...extractCommands(item)));
    } else {
      if (obj.command && typeof obj.command === 'string') commands.push(obj.command);
      for (const key in obj) {
        if (key !== 'command') commands.push(...extractCommands(obj[key]));
      }
    }
  }
  return commands;
};

/**
 * Memory Buffer class with dynamic Little-Endian alignment padding
 */
export class ByteBuffer {
  buffer: number[] = [];
  startAddress: number;

  constructor(startAddress: number) {
    this.startAddress = startAddress;
  }

  get currentAddress() {
    return this.startAddress + this.buffer.length;
  }

  align(bytes: number) {
    const rem = this.currentAddress % bytes;
    if (rem !== 0) {
      const pad = bytes - rem;
      for (let i = 0; i < pad; i++) this.buffer.push(0x58); // 0x58 is the ASCII code for 'X'
    }
  }

  align64() {
    this.align(8); // 64-bit (8 bytes) memory alignment
  }

  pushUInt8(val: number) { 
    this.buffer.push(val & 0xFF); 
  }
  
  pushInt16(val: number) { 
    this.align(2);
    this.buffer.push(val & 0xFF); 
    this.buffer.push((val >> 8) & 0xFF); 
  }

  pushUInt16(val: number) {
    this.align(2);
    this.buffer.push(val & 0xFF); 
    this.buffer.push((val >> 8) & 0xFF); 
  }
  
  pushUInt32(val: number) {
    this.align(4);
    this.buffer.push(val & 0xFF); 
    this.buffer.push((val >> 8) & 0xFF); 
    this.buffer.push((val >> 16) & 0xFF); 
    this.buffer.push((val >> 24) & 0xFF); 
  }

  pushFloat(val: number) {
    this.align(4);
    const buffer = new ArrayBuffer(4);
    new DataView(buffer).setFloat32(0, val, true); // true = Little Endian
    const bytes = new Uint8Array(buffer);
    this.buffer.push(bytes[0], bytes[1], bytes[2], bytes[3]);
  }

  pushDouble(val: number) {
    this.align64(); // align(8)
    const buffer = new ArrayBuffer(8);
    new DataView(buffer).setFloat64(0, val, true); // true = Little Endian
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < 8; i++) this.buffer.push(bytes[i]);
  }

  pushUInt64(val: number | bigint) {
    this.align64();
    const v = BigInt(val);
    const ff = BigInt(0xFF);
    this.buffer.push(Number(v & ff));
    this.buffer.push(Number((v >> BigInt(8)) & ff));
    this.buffer.push(Number((v >> BigInt(16)) & ff));
    this.buffer.push(Number((v >> BigInt(24)) & ff));
    this.buffer.push(Number((v >> BigInt(32)) & ff));
    this.buffer.push(Number((v >> BigInt(40)) & ff));
    this.buffer.push(Number((v >> BigInt(48)) & ff));
    this.buffer.push(Number((v >> BigInt(56)) & ff));
  }

  pushChar(val: string) {
    this.buffer.push(val.charCodeAt(0) || 0);
  }

  pushString(val: string) {
    for (let i = 0; i < val.length; i++) {
      this.buffer.push(val.charCodeAt(i));
    }
    this.buffer.push(0); // Null terminator
  }

  // Used for allocating state variables (rets, ints) to 0
  pushZeroedType(type: string) {
    switch(type) {
      case 'int8':
      case 'uint8': this.pushUInt8(0); break;
      case 'int16':
      case 'uint16': this.pushInt16(0); break;
      case 'int32':
      case 'uint32': this.pushUInt32(0); break;
      case 'int64':
      case 'uint64': this.pushUInt64(BigInt(0)); break;
      case 'float': this.pushFloat(0.0); break;
      case 'double': this.pushDouble(0.0); break;
      case 'char': this.pushChar('\0'); break;
      case '*': 
      case 'str': 
        this.align(2);
        this.buffer.push(0);
        this.buffer.push(0);
        break;
      default: this.pushUInt8(0); break;
    }
  }

  // Method to patch an existing header offset with its final length
  patchUInt16(index: number, val: number) {
    this.buffer[index] = val & 0xFF;
    this.buffer[index + 1] = (val >> 8) & 0xFF;
  }
}

/**
 * Compiles JSON layout into bytecode and a string pool.
 */
export const compileBytecode = (mainJson: any, cmdReg: CmdDef[], pinReg: PinDef[], startAddr: number): CompiledResult => {
  const buf = new ByteBuffer(startAddr);
  const strBuf = new ByteBuffer(0); // myString array starts at relative address 0
  const byteMap: Record<string, { start: number; end: number }> = {};

  // --- Project Header ---
  buf.align(2);
  const projIdx = buf.buffer.length;
  buf.pushUInt16(0x0000); 

  if (mainJson.tabs && Array.isArray(mainJson.tabs)) {
    mainJson.tabs.forEach((tab: any) => {
      
      // --- Tab Header ---
      buf.align(2);
      const tabIdx = buf.buffer.length;
      buf.pushUInt16(0x4000);

      if (tab.sections && Array.isArray(tab.sections)) {
        tab.sections.forEach((sec: any) => {
          
          // --- Section Header ---
          buf.align(2);
          const secIdx = buf.buffer.length;
          buf.pushUInt16(0x8000);

          // Process Section exec parameter (extract number)
          let execVal = 0;
          if (typeof sec.exec === 'string') {
            const match = sec.exec.match(/\d+/);
            if (match) execVal = parseInt(match[0], 10);
          } else if (typeof sec.exec === 'number') {
            execVal = sec.exec;
          }
          buf.pushInt16(execVal); 
          
          // Process Section spare for delay
          buf.pushInt16(0);

          if (sec.rows && Array.isArray(sec.rows)) {
            sec.rows.forEach((row: any) => {
              if (!row.command) return;

              // --- Row Header ---
              buf.align(2);
              const rowIdx = buf.buffer.length;
              buf.pushUInt16(0xC000);
              const headerEnd = buf.buffer.length; // rowIdx + 2

              const match = row.command.match(/^([A-Z0-9_]+)\[(.*)]\]$/) || row.command.match(/^([A-Z0-9_]+)\[(.*)\]$/);
              if (match) {
                const cmdName = match[1];
                const rawArgs = match[2];
                const def = cmdReg.find(c => c.Cmd === cmdName);

                if (def) {
                  // A. Write Opcode (1 byte)
                  const opcodeStart = buf.buffer.length;
                  buf.pushUInt8(def.index);
                  const opcodeEnd = buf.buffer.length;

                  // B. Allocate Return Variables (rets)
                  const retsStart = buf.buffer.length;
                  if (def.rets) {
                    def.rets.forEach(retDef => buf.pushZeroedType(retDef.type));
                  }
                  const retsEnd = buf.buffer.length;

                  // C. Process Input Arguments (args)
                  const argsStart = buf.buffer.length;
                  const args = rawArgs.split(',').map((s: string) => s.trim());
                  def.args.forEach((argDef, i) => {
                    const valStr = args[i] || "";
                    
                    // Pin Resolver
                    let resolvedVal: number | string = valStr;
                    const pinMatch = pinReg.find(p => valStr.includes(p.name));
                    if (pinMatch) resolvedVal = pinMatch.gpio;
                    
                    switch(argDef.type) {
                      case 'int8':
                      case 'uint8': buf.pushUInt8(Number(resolvedVal) || 0); break;
                      case 'int16':
                      case 'uint16': buf.pushInt16(Number(resolvedVal) || 0); break;
                      case 'int32':
                      case 'uint32': buf.pushUInt32(Number(resolvedVal) || 0); break;
                      case 'int64':
                      case 'uint64': 
                        try { buf.pushUInt64(BigInt(resolvedVal)); } 
                        catch { buf.pushUInt64(BigInt(0)); } 
                        break;
                      case 'float': buf.pushFloat(Number(resolvedVal) || 0.0); break;
                      case 'double': buf.pushDouble(Number(resolvedVal) || 0.0); break;
                      case 'char': buf.pushChar(String(resolvedVal)); break;
                      case 'str': 
                        buf.align(2);
                        buf.pushUInt16(strBuf.currentAddress); // Write Address of String to myProg
                        strBuf.pushString(String(resolvedVal)); // Store actual string in myString
                        break;
                      case '*': 
                        buf.align(2);
                        buf.pushUInt16(0); // Empty pointer placeholder
                        break;
                      default: buf.pushUInt8(Number(resolvedVal) || 0); break;
                    }
                  });
                  const argsEnd = buf.buffer.length;

                  // D. Allocate Internal State Variables (ints)
                  const intsStart = buf.buffer.length;
                  if (def.ints) {
                    def.ints.forEach(intDef => buf.pushZeroedType(intDef.type));
                  }
                  const intsEnd = buf.buffer.length;

                  // Track sub-ranges for this row
                  if (row.nodeId) {
                    const id = String(row.nodeId);
                    byteMap[`${id}::header`] = { start: rowIdx, end: headerEnd };
                    byteMap[`${id}::opcode`] = { start: opcodeStart, end: opcodeEnd };
                    byteMap[`${id}::rets`]   = { start: retsStart,   end: retsEnd   };
                    byteMap[`${id}::args`]   = { start: argsStart,   end: argsEnd   };
                    byteMap[`${id}::ints`]   = { start: intsStart,   end: intsEnd   };
                  }
                }
              }

              // Evaluate RLen and patch current Row Header
              const rowLen = buf.buffer.length - rowIdx;
              buf.patchUInt16(rowIdx, 0xC000 | (rowLen & 0x3FFF));

              // Track overall row byte range
              if (row.nodeId) byteMap[String(row.nodeId)] = { start: rowIdx, end: buf.buffer.length };
            });
          }

          // Evaluate RLen and patch current Section Header
          const secLen = buf.buffer.length - secIdx;
          buf.patchUInt16(secIdx, 0x8000 | (secLen & 0x3FFF));

          // Track section byte range
          if (sec.nodeId) byteMap[String(sec.nodeId)] = { start: secIdx, end: buf.buffer.length };
        });
      }

      // Evaluate RLen and patch current Tab Header
      const tabLen = buf.buffer.length - tabIdx;
      buf.patchUInt16(tabIdx, 0x4000 | (tabLen & 0x3FFF));

      // Track tab byte range
      if (tab.nodeId) byteMap[String(tab.nodeId)] = { start: tabIdx, end: buf.buffer.length };
    });
  }

  // Evaluate RLen and patch current Project Header
  const projLen = buf.buffer.length - projIdx;
  buf.patchUInt16(projIdx, 0x0000 | (projLen & 0x3FFF));

  return {
    prog: new Uint8Array(buf.buffer),
    str: new Uint8Array(strBuf.buffer),
    byteMap
  };
};