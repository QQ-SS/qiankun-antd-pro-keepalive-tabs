import { message } from 'antd';
import { useRef } from 'react';
import type { CellObject, ColInfo, Range, Table2SheetOpts, WorkSheet, WritingOptions } from 'xlsx';
import * as XLSX from 'xlsx';
import XlsxPopulate from 'xlsx-populate';

// 字符串转ArrayBuffer
function s2ab(s: string) {
  const buf = new ArrayBuffer(s.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i !== s.length; ++i) view[i] = s.charCodeAt(i) & 0xff;
  return buf;
}

// 将一个sheet转成最终的excel文件的blob对象，然后利用URL.createObjectURL下载
function sheet2blob(sheet: WorkSheet, sheetName?: string) {
  // eslint-disable-next-line no-param-reassign
  sheetName = sheetName || 'Sheet1';
  const workbook: XLSX.WorkBook = {
    SheetNames: [sheetName],
    Sheets: {},
  };

  workbook.Sheets[sheetName] = sheet; // 生成excel的配置项

  const wopts: WritingOptions = {
    bookType: 'xlsx', // 要生成的文件类型
    bookSST: false, // 是否生成Shared String Table，官方解释是，如果开启生成速度会下降，但在低版本IOS设备上有更好的兼容性
    type: 'binary',
  };
  const wbout = XLSX.write(workbook, wopts);
  const blob = new Blob([s2ab(wbout)], {
    type: 'application/octet-stream',
  });

  return blob;
}

function openDownloadDialog(url: any, saveName: string) {
  if (typeof url === 'object' && url instanceof Blob) {
    // eslint-disable-next-line no-param-reassign
    url = URL.createObjectURL(url); // 创建blob地址
  }
  const aLink = document.createElement('a');
  aLink.href = url;
  aLink.download = saveName || ''; // HTML5新增的属性，指定保存文件名，可以不要后缀，注意，file:///模式下不会生效
  let event;
  if (window.MouseEvent)
    event = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
    });
  else {
    event = document.createEvent('MouseEvents');
    event.initMouseEvent(
      'click',
      true,
      false,
      window,
      0,
      0,
      0,
      0,
      0,
      false,
      false,
      false,
      false,
      0,
      null,
    );
  }
  aLink.dispatchEvent(event);
}

function getCellWidth(value?: string | number | boolean | Date) {
  // 判断是否为null或undefined
  if (typeof value === 'undefined' || value === null) {
    return 10;
  } else if (/.*[\u4e00-\u9fa5]+.*$/.test(value.toString())) {
    // 中文的长度
    const chineseLength = value.toString().match(/[\u4e00-\u9fa5]/g)?.length ?? 0;
    // 其他不是中文的长度
    const otherLength = value.toString().length - chineseLength;
    return chineseLength * 2.4 + otherLength * 1.2;
  } else {
    return value.toString().length * 1.2;
    /* 另一种方案
    value = value.toString()
    return value.replace(/[\u0391-\uFFE5]/g, 'aa').length
    */
  }
}
// https://github.com/SheetJS/sheetjs/issues/1473#issuecomment-1291746676
function autoFitColumns(worksheet: WorkSheet) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
  const [startLetter, endLetter] = worksheet['!ref']?.replace(/\d/, '').split(':')!;
  const numRegexp = new RegExp(/\d+$/g);
  const start = startLetter.charCodeAt(0),
    end = endLetter.charCodeAt(0) + 1,
    rows = +numRegexp.exec(endLetter)![0];
  const ranges: number[] = [];
  for (let i = start; i < end; i++) {
    ranges.push(i);
  }
  const objectMaxLength: ColInfo[] = [];

  // Loop on columns
  ranges.forEach((c) => {
    const cell = String.fromCharCode(c);
    let maxCellLength = 0;
    // Loop on rows
    for (let y = 1; y <= rows; y++) {
      const cellLength = getCellWidth(worksheet[`${cell}${y}`]?.v) + 1;
      if (cellLength > maxCellLength) {
        maxCellLength = cellLength;
      }
    }
    objectMaxLength.push({ width: maxCellLength });
  });
  worksheet['!cols'] = objectMaxLength;
}

// https://github.com/SheetJS/sheetjs/issues/352#issuecomment-456976898
function clamp_range(range: Range) {
  if (range.e.r >= 1 << 20) range.e.r = (1 << 20) - 1;
  if (range.e.c >= 1 << 14) range.e.c = (1 << 14) - 1;
  return range;
}

const crefregex =
  /(^|[^._A-Z0-9])([$]?)([A-Z]{1,2}|[A-W][A-Z]{2}|X[A-E][A-Z]|XF[A-D])([$]?)([1-9]\d{0,5}|10[0-3]\d{4}|104[0-7]\d{3}|1048[0-4]\d{2}|10485[0-6]\d|104857[0-6])(?![_.(A-Za-z0-9])/g;

/**
  deletes `nrows` rows STARTING WITH `start_row`
  - ws         = worksheet object
  - start_row  = starting row (0-indexed) | default 0
  - nrows      = number of rows to delete | default 1
*/
function delete_rows(ws: WorkSheet, start_row: number, nrows: number) {
  if (!ws) throw new Error('operation expects a worksheet');
  const dense = Array.isArray(ws);
  // eslint-disable-next-line no-param-reassign
  if (!nrows) nrows = 1;
  // eslint-disable-next-line no-param-reassign
  if (!start_row) start_row = 0;

  /* extract original range */
  const range = XLSX.utils.decode_range(ws['!ref']!);
  let R = 0,
    C = 0;

  const formula_cb = function (
    $0: any,
    $1: string,
    $2: string,
    $3: string,
    $4: string,
    $5: string,
  ) {
    let _R = XLSX.utils.decode_row($5);
    const _C = XLSX.utils.decode_col($3);
    if (_R >= start_row) {
      _R -= nrows;
      if (_R < start_row) return '#REF!';
    }
    return (
      $1 +
      ($2 === '$' ? $2 + $3 : XLSX.utils.encode_col(_C)) +
      ($4 === '$' ? $4 + $5 : XLSX.utils.encode_row(_R))
    );
  };

  let addr, naddr;
  /* move cells and update formulae */
  if (dense) {
    for (R = start_row + nrows; R <= range.e.r; ++R) {
      if (ws[R])
        ws[R].forEach(function (cell: CellObject) {
          cell.f = cell.f?.replace(crefregex, formula_cb);
        });
      ws[R - nrows] = ws[R];
    }
    ws.length -= nrows;
    for (R = 0; R < start_row; ++R) {
      if (ws[R])
        ws[R].forEach(function (cell: CellObject) {
          cell.f = cell.f?.replace(crefregex, formula_cb);
        });
    }
  } else {
    for (R = start_row + nrows; R <= range.e.r; ++R) {
      for (C = range.s.c; C <= range.e.c; ++C) {
        addr = XLSX.utils.encode_cell({ r: R, c: C });
        naddr = XLSX.utils.encode_cell({ r: R - nrows, c: C });
        if (!ws[addr]) {
          delete ws[naddr];
          continue;
        }
        if (ws[addr].f) ws[addr].f = ws[addr].f.replace(crefregex, formula_cb);
        ws[naddr] = ws[addr];
      }
    }
    for (R = range.e.r; R > range.e.r - nrows; --R) {
      for (C = range.s.c; C <= range.e.c; ++C) {
        addr = XLSX.utils.encode_cell({ r: R, c: C });
        delete ws[addr];
      }
    }
    for (R = 0; R < start_row; ++R) {
      for (C = range.s.c; C <= range.e.c; ++C) {
        addr = XLSX.utils.encode_cell({ r: R, c: C });
        if (ws[addr] && ws[addr].f) ws[addr].f = ws[addr].f.replace(crefregex, formula_cb);
      }
    }
  }

  /* write new range */
  range.e.r -= nrows;
  if (range.e.r < range.s.r) range.e.r = range.s.r;
  ws['!ref'] = XLSX.utils.encode_range(clamp_range(range));

  /* merge cells */
  if (ws['!merges']) {
    ws['!merges'].forEach(function (merge, idx) {
      let mergerange;
      switch (typeof merge) {
        case 'string':
          mergerange = XLSX.utils.decode_range(merge);
          break;
        case 'object':
          mergerange = merge;
          break;
        default:
          throw new Error('Unexpected merge ref ' + merge);
      }
      if (mergerange.s.r >= start_row) {
        mergerange.s.r = Math.max(mergerange.s.r - nrows, start_row);
        if (mergerange.e.r < start_row + nrows) {
          // @ts-ignore
          delete ws['!merges'][idx];
          return;
        }
      } else if (mergerange.e.r >= start_row) mergerange.e.r = Math.max(mergerange.e.r - nrows, start_row);
      clamp_range(mergerange);
      // @ts-ignore
      ws['!merges'][idx] = mergerange;
    });
  }
  if (ws['!merges']) {
    ws['!merges'] = ws['!merges'].filter(function (x) {
      return !!x;
    });
  }

  /* rows */
  if (ws['!rows']) ws['!rows'].splice(start_row, nrows);
}

// https:github.com/SheetJS/sheetjs/issues/1304#issuecomment-434206858

/**
  deletes `ncols` cols STARTING WITH `start_col`
  - ws         = worksheet object
  - start_col  = starting col (0-indexed) | default 0
  - ncols      = number of cols to delete | default 1

  usage: delete_cols(ws, 4, 3); // deletes columns E-G and shifts everything after G to the left by 3 columns
*/
function delete_cols(ws: WorkSheet, start_col: number, ncols: number) {
  if (!ws) throw new Error('operation expects a worksheet');
  // const dense = Array.isArray(ws);
  // eslint-disable-next-line no-param-reassign
  if (!ncols) ncols = 1;
  // eslint-disable-next-line no-param-reassign
  if (!start_col) start_col = 0;

  /* extract original range */
  const range = XLSX.utils.decode_range(ws['!ref']!);
  let R = 0,
    C = 0;

  const formula_cb = function ($0: any, $1: any, $2: string, $3: string, $4: string, $5: string) {
    const _R = XLSX.utils.decode_row($5);
    let _C = XLSX.utils.decode_col($3);
    if (_C >= start_col) {
      _C -= ncols;
      if (_C < start_col) return '#REF!';
    }
    return (
      $1 +
      ($2 === '$' ? $2 + $3 : XLSX.utils.encode_col(_C)) +
      ($4 === '$' ? $4 + $5 : XLSX.utils.encode_row(_R))
    );
  };

  let addr, naddr;
  for (C = start_col + ncols; C <= range.e.c; ++C) {
    for (R = range.s.r; R <= range.e.r; ++R) {
      addr = XLSX.utils.encode_cell({ r: R, c: C });
      naddr = XLSX.utils.encode_cell({ r: R, c: C - ncols });
      if (!ws[addr]) {
        delete ws[naddr];
        continue;
      }
      if (ws[addr].f) ws[addr].f = ws[addr].f.replace(crefregex, formula_cb);
      ws[naddr] = ws[addr];
    }
  }
  for (C = range.e.c; C > range.e.c - ncols; --C) {
    for (R = range.s.r; R <= range.e.r; ++R) {
      addr = XLSX.utils.encode_cell({ r: R, c: C });
      delete ws[addr];
    }
  }
  for (C = 0; C < start_col; ++C) {
    for (R = range.s.r; R <= range.e.r; ++R) {
      addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (ws[addr] && ws[addr].f) ws[addr].f = ws[addr].f.replace(crefregex, formula_cb);
    }
  }

  /* write new range */
  range.e.c -= ncols;
  if (range.e.c < range.s.c) range.e.c = range.s.c;
  ws['!ref'] = XLSX.utils.encode_range(clamp_range(range));

  /* merge cells */
  if (ws['!merges'])
    ws['!merges'].forEach(function (merge, idx) {
      let mergerange;
      switch (typeof merge) {
        case 'string':
          mergerange = XLSX.utils.decode_range(merge);
          break;
        case 'object':
          mergerange = merge;
          break;
        default:
          throw new Error('Unexpected merge ref ' + merge);
      }
      if (mergerange.s.c >= start_col) {
        mergerange.s.c = Math.max(mergerange.s.c - ncols, start_col);
        if (mergerange.e.c < start_col + ncols) {
          // @ts-ignore
          delete ws['!merges'][idx];
          return;
        }
        mergerange.e.c -= ncols;
        if (mergerange.e.c < mergerange.s.c) {
          // @ts-ignore
          delete ws['!merges'][idx];
          return;
        }
      } else if (mergerange.e.c >= start_col) mergerange.e.c = Math.max(mergerange.e.c - ncols, start_col);
      clamp_range(mergerange);
      // @ts-ignore
      ws['!merges'][idx] = mergerange;
    });
  if (ws['!merges'])
    ws['!merges'] = ws['!merges'].filter(function (x) {
      return !!x;
    });

  /* cols */
  if (ws['!cols']) ws['!cols'].splice(start_col, ncols);
}

// 根据传入的样式行列信息加样式
function addStyle(blob: Blob, dataInfo?: any) {
  return XlsxPopulate.fromDataAsync(blob).then((workbook: any) => {
    // 循环所有的表
    workbook.sheets().forEach((sheet: any) => {
      // 所有cell垂直居中,修改字体
      sheet.usedRange().style({
        fontFamily: 'Arial',
        verticalAlignment: 'center',
      });
      // 去除所有边框
      sheet.gridLinesVisible(false);

      // title加粗合并及居中
      if (dataInfo?.titleRange) {
        // const title = sheet.cell(dataInfo.titleCell).value();
        sheet.range(dataInfo.titleRange).merged(true).style({
          bold: true,
          horizontalAlignment: 'center',
          verticalAlignment: 'center',
        });
      }

      // 表头加粗及背景色
      if (dataInfo?.theadRange) {
        sheet.range(dataInfo.theadRange).style({
          fill: 'ececec',
          bold: true,
          horizontalAlignment: 'center',
        });
      }

      // 表格内容右对齐
      if (dataInfo?.tbodyRange) {
        sheet.range(dataInfo.tbodyRange).style({
          horizontalAlignment: 'right',
        });
      }

      // 表格黑色细边框
      if (dataInfo?.tableRange) {
        sheet.range(dataInfo.tableRange).style({
          border: {
            style: 'thin',
            color: 'b1b1b1',
            direction: 'both',
          },
        });
      }
    });

    return workbook.outputAsync() as Blob;
    // .then(URL.createObjectURL);
  });
}

export interface TableExportOptions {
  opts?: Table2SheetOpts;
  /** 列头行数 */
  headRowCount?: number;
  /** 跳过表格列 */
  skipCols?: [startCol: number, nCols: number][];
}

function useTableExport(id: string) {
  /** 表格数据行号 */
  let tableBodyRowIndex = 1;

  const sheetsRef = useRef<WorkSheet[]>([]);
  // const skipRowsRef = useRef<[number, number][]>([]);

  /**
   * 从 table 中生成 sheet
   * skipCols : [起始列号, 要删除的列数][]
   */
  const exportTable = async ({
    opts = { raw: true },
    headRowCount = 1,
    skipCols = [],
  }: TableExportOptions) => {
    tableBodyRowIndex = headRowCount;
    return new Promise<boolean>((resolve) => {
      const table = document.querySelector(`#${id}`)?.querySelector('table');
      if (!table) {
        message.error('未指定表格');
        resolve(false);
        return;
      }
      const sheet = XLSX.utils.table_to_sheet(table, opts);
      // console.log(sheet);

      skipCols?.forEach((row) => {
        if (Array.isArray(row)) {
          // eslint-disable-next-line prefer-const
          let [start_col, ncols] = row;
          if (start_col < 0) {
            const range = XLSX.utils.decode_range(sheet['!ref']!);
            start_col = range.e.c + start_col + 1;
          }
          delete_cols(sheet, start_col, ncols);
        }
      });

      // skipRowsRef.current = skipRows;
      sheetsRef.current.push(sheet);
      resolve(true);
    });
  };

  const downloadWorkBook = async ({
    fileName,
    sheetName,
  }: {
    fileName?: string;
    sheetName?: string;
  }) => {
    // 合并 sheets 到一个
    const sheetJson: any[] = [];
    sheetsRef.current.forEach((sheet, index) => {
      const json = XLSX.utils.sheet_to_json(sheet, {
        raw: true,
        defval: '', // 空单元格也需要输出，不然合并后以列顺序会错位
        header: 'A', // 使用 {A:'', B:''} 格式，以兼容合并单元格
      });

      // // debugger;

      if (index !== 0) {
        // 后续表格完全删除表头
        json.splice(0, tableBodyRowIndex);
      }
      sheetJson.push(...json);
    });

    // console.log(sheetJson);
    const sheet = XLSX.utils.json_to_sheet(sheetJson, {
      skipHeader: true, // header: 'A'格式在生成 sheet 时，会在第一行导出 A B C，所以要跳过表头
    });
    // console.log(sheet);

    // 宽度自适应
    autoFitColumns(sheet);

    // 从第一张表中复制合并单元格信息
    sheet['!merges'] = sheetsRef.current[0]['!merges'];

    // 需要添加样式的行列信息
    const range = XLSX.utils.decode_range(sheet['!ref']!);
    const dataInfo = {
      // 表单数据
      tableRange: sheet['!ref']!,
      // 标题
      // titleCell: 'A2',
      // titleRange: 'A1:B2',
      // 列头
      theadRange: `${XLSX.utils.encode_cell({
        c: range.s.c,
        r: range.s.r,
      })}:${XLSX.utils.encode_cell({
        c: range.e.c,
        r: tableBodyRowIndex - 1,
      })}`,
      // 表格数据
      tbodyRange: `${XLSX.utils.encode_cell({
        c: range.s.c,
        r: tableBodyRowIndex,
      })}:${XLSX.utils.encode_cell({
        c: range.e.c,
        r: range.e.r,
      })}`,
    };

    // 准备加样式
    const blob = await addStyle(sheet2blob(sheet, sheetName), dataInfo);
    // 清理
    sheetsRef.current = [];
    openDownloadDialog(blob, `${fileName || '下载'}.xlsx`);
  };
  return { exportTable, downloadWorkBook };
}

export default useTableExport;
