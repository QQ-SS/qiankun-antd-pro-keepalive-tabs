import { DateRangeDefaultPresets } from '@/components//RangePicker/DateRange';
import PinYinSearchSelect from '@/components/Select/PinYinSearchSelect';
import useLocalStorageStateEx from '@/hooks/useLocalStorageStateEx';
import type { TableExportOptions } from '@/hooks/useTableExport';
import useTableExport from '@/hooks/useTableExport';
import { MAX_INT32, keyLookup, transformOption as transformOptions } from '@/utils';
import { DownloadOutlined, FilterOutlined } from '@ant-design/icons';
import type {
  ActionType,
  ProColumnType as AntProColumnType,
  ProTableProps as AntProTableProps,
  ColumnsState,
  PageInfo,
  ProFormInstance,
} from '@ant-design/pro-components';
import {
  ProTable as AntProTable,
  ProFormDigitRange,
  ProProvider,
} from '@ant-design/pro-components';
import type { EventEmitter } from 'ahooks/lib/useEventEmitter';
import type { ButtonProps, ModalFuncProps } from 'antd';
import {
  Button,
  Checkbox,
  Col,
  ConfigProvider,
  Modal,
  Popover,
  Radio,
  Row,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import Crypto from 'crypto';
import { last, omit } from 'lodash';
import { useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';

interface ProTableHideCols {
  defaultPageSize?: number;
  hideCol?: Record<string, ColumnsState>;
  hideSearch?: Record<string, ColumnsState>;
}

export interface ProTableEventType {
  cacheHideCols?: ProTableHideCols;
}

type VALUE_TYPE = 'tags' | 'dateBeginEnd' | 'moneyRange' | 'numberRange' | 'boolean';

interface ProColumnType<T, V> extends Omit<AntProColumnType<T, V>, 'children'> {
  children?: ProColumns<T>[];

  /** 在表格中完全移除 */
  proRemoveInTable?: boolean;
  /** 默认在列中隐藏 */
  proHideInTableColumns?: boolean;
  /** 默认在搜索表单中隐藏 */
  proHideInSearch?: boolean;
}

export type ProColumns<DataSource> = ProColumnType<DataSource, VALUE_TYPE>;

interface ProTableProps<DataSource extends Record<string, any>, Params extends Record<string, any>>
  extends Omit<AntProTableProps<DataSource, Params, VALUE_TYPE>, 'columns'> {
  columns: ProColumns<DataSource>[];
  eventBus?: EventEmitter<ProTableEventType>;
  exportButtonProps?: ButtonProps & {
    /** 不重新加载表格数据 */
    noReload?: boolean;
    /** 保存的文件名 */
    fileName?: string;
  };
}

function ProTable<
  DataSource extends Record<string, any>,
  Params extends Record<string, any> = Record<string, any>,
>(props: ProTableProps<DataSource, Params>) {
  const {
    actionRef: propActionRef,
    formRef: propFormRef,
    pagination: propPagination,
    columns: propColumns,
    search: propSearch,
    toolBarRender: propToolBarRender,
    toolbar: propToolbar,
    rowSelection: propRowSelection,
    eventBus,
    exportButtonProps = {},
    ...restProps
  } = props;

  const defaultActionRef = useRef<ActionType>();
  const defaultFormRef = useRef<ProFormInstance>();
  const actionRef = (propActionRef || defaultActionRef) as React.MutableRefObject<
    ActionType | undefined
  >;
  const formRef = propFormRef || defaultFormRef;

  /** 持久化的key，用于存储到 storage 中 */
  const persistenceKey = useMemo(() => {
    const cols = propColumns.map((x) => x.title).join('');
    const hash = Crypto.createHash('md5');
    const result = hash.update(`${location.pathname}/${cols}`).digest('hex');
    return result;
  }, [propColumns]);

  // 搜索列隐藏支持
  const defaultHideCols = useMemo(() => {
    const hideCol: Record<string, ColumnsState> = {};
    const hideSearch: Record<string, ColumnsState & { title: ProColumns<DataSource>['title'] }> =
      {};
    let order = 0;
    const deepCol = (cols: ProColumns<DataSource>[]) => {
      cols
        ?.filter((c) => !c.proRemoveInTable)
        .forEach((column, index) => {
          const key =
            column.key || !column.dataIndex
              ? `${index}`
              : typeof column.dataIndex === 'string'
              ? column.dataIndex
              : Array.isArray(column.dataIndex)
              ? column.dataIndex.join(',')
              : JSON.stringify(column.dataIndex);

          if (column.proHideInTableColumns) {
            hideCol[key] = { show: false };
          }
          if (
            column.valueType !== 'option' &&
            !Array.isArray(column.dataIndex) &&
            ((propSearch !== false && column.search !== false) || column.search)
          ) {
            // proHideInSearch 本字段不可搜索
            hideSearch[key] = {
              show: !column.proHideInSearch,
              title: column.title,
              order: column.order ? -column.order : order++,
            };
          }

          // if (column.children && Array.isArray(column.children)) {
          //   deepCol(column.children);
          // }
        });
    };
    deepCol(propColumns);
    return { hideCol, hideSearch };
  }, [propColumns, propSearch]);

  const defaultCacheHideCols = useMemo(() => {
    const hideSearch: ProTableHideCols['hideSearch'] = {};
    Object.keys(defaultHideCols?.hideSearch ?? {}).forEach((key) => {
      hideSearch[key] = {
        ...omit(defaultHideCols?.hideSearch?.[key], 'title'),
      };
    });
    return {
      hideCol: defaultHideCols.hideCol,
      hideSearch,
    };
  }, [defaultHideCols.hideCol, defaultHideCols?.hideSearch]);

  const [cacheHideCols, setCacheHideCols] = useLocalStorageStateEx<ProTableHideCols>(
    `protable_hide_cols`,
    persistenceKey,
    {
      defaultValue: defaultCacheHideCols,
    },
  );

  const columnsSearchChecked = useMemo(() => {
    return Object.keys(cacheHideCols?.hideSearch ?? defaultHideCols?.hideSearch ?? {}).filter(
      (key) => cacheHideCols?.hideSearch?.[key]?.show ?? defaultHideCols?.hideSearch?.[key]?.show,
    );
  }, [cacheHideCols?.hideSearch, defaultHideCols?.hideSearch]);

  useLayoutEffect(() => {
    eventBus?.emit({ cacheHideCols });
  }, [eventBus, cacheHideCols]);

  // 导出支持
  const { exportTable, downloadWorkBook } = useTableExport(`protable_${persistenceKey}`);
  const [modal, contextHolder] = Modal.useModal();
  const selectedRowsRef = useRef<{
    selectedRowKeys?: (string | number)[];
    selectedRows?: DataSource[];
  }>({});
  const [exporting, setExporting] = useState(false);
  const prevPageInfoRef = useRef<PageInfo | undefined>();
  /** 指向 resolve 函数，用于完成导出 */
  const resolveExportModalRef = useRef<(payload: boolean) => void>();
  const exportModalRef = useRef<
    | {
        destroy: () => void;
        update: (configUpdate: ModalFuncProps) => void;
      }
    | undefined
  >();

  const exportTableOptions = useMemo<TableExportOptions>(() => {
    let headRowCount = 0;
    const rootCols = propColumns?.filter((c) => !c.proRemoveInTable && !c.hideInTable);
    // 通过 propColumns 的 children 的深度计算出列头行数
    function loop(columns: ProColumns<DataSource>[], level: number): void {
      const cols = columns?.filter((c) => !c.proRemoveInTable && !c.hideInTable);
      if (cols?.length) {
        // eslint-disable-next-line no-param-reassign
        level++;
        if (level > headRowCount) {
          headRowCount = level;
        }
        for (const column of cols) {
          loop(column.children ?? [], level);
        }
      }
    }
    loop(rootCols, 0);
    return { headRowCount, skipCols: last(rootCols)?.valueType === 'option' ? [[-1, 1]] : [] };
  }, [propColumns]);

  const resetExportModal = () => {
    setTimeout(() => {
      // 导出完成
      resolveExportModalRef.current?.(true);
      actionRef.current?.setPageInfo?.(prevPageInfoRef.current || {});
      resolveExportModalRef.current = undefined;
      prevPageInfoRef.current = undefined;
      exportModalRef.current = undefined;
      setExporting(false);
    });
  };

  const onDataSourceChange = (dataSource?: DataSource[]) => {
    if (prevPageInfoRef.current) {
      // 需要导出数据
      exportTable({
        ...exportTableOptions,
      })
        .then(async () => {
          const { total = 0, current = 1, pageSize = 20 } = actionRef.current?.pageInfo || {};
          if (!dataSource || (dataSource?.length ?? 0) < pageSize || total <= current * pageSize) {
            // 已加载完成
            exportModalRef.current?.update?.({
              cancelButtonProps: { disabled: true },
              okText: '压缩中...',
            });
            await downloadWorkBook({
              fileName: exportButtonProps?.fileName,
            });
            resetExportModal();
          } else {
            // 加载下一页
            const pageCount = total / pageSize > 0 ? Math.ceil(total / pageSize) : 1;
            exportModalRef.current?.update?.({
              cancelButtonProps: { disabled: true },
              okText: `导出 ${current + 1} / ${pageCount} 页`,
            });
            actionRef.current?.setPageInfo?.({ current: current + 1 });
          }
        })
        .catch(async (e) => {
          console.log(e);

          exportModalRef.current?.update?.({
            cancelButtonProps: { disabled: true },
            okText: '压缩中...',
          });
          await downloadWorkBook({
            fileName: exportButtonProps?.fileName,
          });
          resetExportModal();
        });
    }
  };

  // 表格列处理
  const warpColumns = (
    columns: ProColumns<DataSource>[],
  ): AntProColumnType<DataSource, VALUE_TYPE>[] => {
    return columns
      .filter((c) => !c.proRemoveInTable)
      .map((column, index) => {
        const {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          proRemoveInTable,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          proHideInTableColumns,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          proHideInSearch,

          search,
          fieldProps,
          valueType,
          children,
          hideInSetting,
          ...restCol
        } = column;

        const key =
          column.key || !column.dataIndex
            ? `${index}`
            : typeof column.dataIndex === 'string'
            ? column.dataIndex
            : Array.isArray(column.dataIndex)
            ? column.dataIndex.join(',')
            : JSON.stringify(column.dataIndex);

        const result: AntProColumnType<DataSource, VALUE_TYPE> = {
          ...restCol,
          search: cacheHideCols?.hideSearch?.[key]?.show === false ? false : search, // 可以通过 columnsSearchMap 设置是否显示
          fieldProps,
          valueType,
          // @ts-ignore
          children: Array.isArray(children) ? warpColumns(children ?? []) : children,

          // 操作列默认不允许隐藏
          // hideInSetting: true, 不在 表格设置/列展示 下拉选择 中显示
          hideInSetting:
            typeof hideInSetting === 'boolean' ? hideInSetting : valueType === 'option',
        };

        if (valueType === 'dateBeginEnd') {
          result.valueType = 'dateRange';
          result.fieldProps = {
            presets: transformOptions(DateRangeDefaultPresets),
            ...fieldProps,
          };
          result.render = (dom, entity) => {
            const text = Array.isArray(column.dataIndex)
              ? keyLookup(entity, column.dataIndex as string[])
              : entity[column.dataIndex as keyof DataSource];
            return text;
          };
        } else if (valueType === 'moneyRange') {
          result.valueType = 'money';
          result.renderFormItem = (schema, { type }) => {
            if (type === 'form') {
              return null;
            }
            // const { fieldProps } = schema;
            return (
              <ProFormDigitRange
                noStyle
                fieldProps={{
                  prefix: '￥',
                  precision: 2,
                  ...fieldProps,
                }}
              />
            );
          };
        } else if (valueType === 'numberRange') {
          result.valueType = 'digit';
          result.renderFormItem = (schema, { type }) => {
            if (type === 'form') {
              return null;
            }
            // const { fieldProps } = schema;
            return <ProFormDigitRange noStyle fieldProps={fieldProps} />;
          };
        } else if (valueType === 'select') {
          if (fieldProps?.showSearch) {
            result.renderFormItem = (schema, { type, options }) => {
              if (type === 'form') {
                return null;
              }
              // const { fieldProps } = schema;
              return <PinYinSearchSelect {...fieldProps} options={options} />;
            };
          }
        }

        return result;
      });
  };

  const values = useContext(ProProvider);
  const { getPrefixCls } = useContext(ConfigProvider.ConfigContext);
  const prefixCls = getPrefixCls('');

  return (
    <ProProvider.Provider
      value={{
        ...values,
        valueTypeMap: {
          // link: {
          //   render: (text) => <a>{text}</a>,
          //   renderFormItem: (text, props) => (
          //     <Input placeholder="请输入链接" {...props?.fieldProps} />
          //   ),
          // },
          tags: {
            render: (text) => {
              return (
                <>
                  {[text].flat(1).map((item) => (
                    <Tag key={item}>{item}</Tag>
                  ))}
                </>
              );
            },
            renderFormItem: (text, _props) => {
              const { fieldProps, valueEnum } = _props;
              return <PinYinSearchSelect {...fieldProps} options={valueEnum} />;
            },
          },
          // moneyRange: {
          //   render: (text, _props) => {
          //     const { fieldProps } = _props;
          //     const { prefix = '￥', precision = 2 } = fieldProps;
          //     return (
          //       <>
          //         {prefix} {toFixed(text, precision, ',')}
          //       </>
          //     );
          //   },
          //   renderFormItem: (text, _props) => {
          //     const { fieldProps } = _props;
          //     return (
          //       <ProFormDigitRange fieldProps={{ prefix: '￥', precision: 2, ...fieldProps }} />
          //     );
          //   },
          // },
          boolean: {
            render: (text) => {
              return text ? <Tag color="green">是</Tag> : <Tag>否</Tag>;
            },
            renderFormItem: (text, _props) => {
              const { fieldProps, valueEnum = { '': '不限', true: '是', false: '否' } } = _props;
              return (
                <Radio.Group
                  optionType="button"
                  buttonStyle="solid"
                  {...fieldProps}
                  options={Object.keys(valueEnum).map((k) => ({
                    value: k,
                    // @ts-ignore
                    label: valueEnum[k],
                  }))}
                />
              );
            },
          },
        },
      }}
    >
      <AntProTable<DataSource, Params, VALUE_TYPE>
        columns={warpColumns(propColumns)}
        search={
          propSearch === false
            ? propSearch
            : {
                span: {
                  xs: 12,
                  sm: 8,
                  md: 8,
                  lg: 8,
                  xl: 8,
                  xxl: 6,
                },
                defaultCollapsed: true,
                labelWidth: 'auto',
                showHiddenNum: true,
                filterType: 'query',
                ...propSearch,
              }
        }
        rowKey="id"
        {...restProps}
        id={`protable_${persistenceKey}`}
        actionRef={actionRef}
        formRef={formRef}
        pagination={
          typeof propPagination === 'boolean'
            ? propPagination
            : {
                pageSizeOptions: ['10', '20', '50', '100'],
                showSizeChanger: true,
                ...propPagination,
                defaultPageSize: cacheHideCols?.defaultPageSize ?? 20,
              }
        }
        columnsState={{
          value: cacheHideCols?.hideCol,
          onChange: (map) =>
            setCacheHideCols((prev) => ({
              ...prev,
              hideCol: map,
            })),
        }}
        // 同时存在 rowSelection 和 全并单元格 时，XLSX 导出会发生错位
        rowSelection={
          typeof propRowSelection === 'undefined' || propRowSelection === false || exporting
            ? undefined
            : {
                ...propRowSelection,
                onChange: (selectedRowKeys, selectedRows, info) => {
                  propRowSelection?.onChange?.(selectedRowKeys, selectedRows, info);
                  selectedRowsRef.current = { selectedRowKeys, selectedRows };
                },
              }
        }
        toolBarRender={propToolBarRender === false ? propToolBarRender : undefined}
        toolbar={{
          ...omit(propToolbar, ['actions']),
          actions: [
            ...(typeof propToolBarRender === 'function'
              ? propToolBarRender?.(actionRef.current, selectedRowsRef.current)
              : []),
            ...(propToolbar?.actions ?? []),
            exportButtonProps ? (
              <Button
                {...omit(exportButtonProps, ['fileName', 'skipRows', 'skipCols', 'noReload'])}
                key="DownloadButton"
                // loading={loadingExport}
                icon={exportButtonProps.icon || <DownloadOutlined />}
                size="small"
                onClick={() => {
                  exportModalRef.current = modal.confirm({
                    maskClosable: false,
                    title: '导出数据确认',
                    cancelText: '取消',
                    okText: '确认',
                    content: (
                      <>
                        这将需要花费一段时间，确认要导出数据吗？
                        <br />
                        <Typography.Text type="warning">
                          为保证导出数据正确无误，请确保没有其他人在同时操作表格数据！
                        </Typography.Text>
                      </>
                    ),
                    onOk: () => {
                      return new Promise((resolve) => {
                        resolveExportModalRef.current = resolve;
                        prevPageInfoRef.current = actionRef.current?.pageInfo;
                        setExporting(true);
                        const noReload = !!exportButtonProps?.noReload || !props.request;
                        const pageSize = noReload ? MAX_INT32 : 200;
                        const { total = 0 } = actionRef.current?.pageInfo || {};
                        const pageCount = total / pageSize > 0 ? Math.ceil(total / pageSize) : 1;

                        // 从第一页开始加载
                        exportModalRef.current?.update?.({
                          cancelButtonProps: { disabled: true },
                          okText: `导出 1 / ${pageCount} 页`,
                        });
                        actionRef.current?.setPageInfo?.({ current: 1, pageSize });

                        if (noReload) {
                          // 无法重新加载数据 或 不需要，直接导出
                          setTimeout(() => {
                            onDataSourceChange();
                          });
                        }
                      });
                    },
                    // onCancel: () => { }
                  });
                }}
              >
                {exportButtonProps.title || '导出表格'}
              </Button>
            ) : null,
            propSearch !== false && Object.keys(defaultHideCols?.hideSearch ?? {}).length ? (
              <Popover
                title={
                  <div
                    style={{
                      paddingTop: 4,
                      paddingBottom: 4,
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Checkbox
                      indeterminate={
                        columnsSearchChecked.length > 0 &&
                        columnsSearchChecked.length <
                          Object.keys(cacheHideCols?.hideSearch ?? {}).length
                      }
                      onChange={(e) => {
                        setCacheHideCols((prev) => {
                          const hideSearch: ProTableHideCols['hideSearch'] = {};
                          Object.keys(cacheHideCols?.hideSearch ?? {}).forEach((key) => {
                            hideSearch[key] = {
                              ...prev?.hideSearch?.[key],
                              show: e.target.checked,
                            };
                          });
                          return {
                            ...prev,
                            hideSearch,
                          };
                        });
                      }}
                      checked={
                        columnsSearchChecked.length ===
                        Object.keys(cacheHideCols?.hideSearch ?? {}).length
                      }
                    >
                      过滤项展示
                    </Checkbox>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => {
                        // console.log(hides.hideSearch);
                        setCacheHideCols((prev) => {
                          const hideSearch: ProTableHideCols['hideSearch'] = {};
                          Object.keys(defaultHideCols?.hideSearch ?? {}).forEach((key) => {
                            hideSearch[key] = {
                              ...omit(defaultHideCols?.hideSearch?.[key], 'title'),
                            };
                          });
                          return {
                            ...prev,
                            hideCol: defaultHideCols.hideCol,
                            hideSearch,
                          };
                        });
                      }}
                    >
                      重置
                    </Button>
                  </div>
                }
                content={
                  <Checkbox.Group
                    value={columnsSearchChecked}
                    style={{ width: 200 }}
                    onChange={(checkedValues) => {
                      // console.log(checkedValues);
                      setCacheHideCols((prev) => {
                        const hideSearch: ProTableHideCols['hideSearch'] = {};
                        Object.keys(cacheHideCols?.hideSearch ?? {}).forEach((key) => {
                          hideSearch[key] = {
                            ...prev?.hideSearch?.[key],
                            show: checkedValues.includes(key),
                          };
                        });
                        return {
                          ...prev,
                          hideSearch,
                        };
                      });
                    }}
                  >
                    <Row>
                      {Object.keys(defaultHideCols?.hideSearch ?? {})
                        .sort(
                          (a, b) =>
                            (defaultHideCols.hideSearch?.[a]?.order ?? 0) -
                            (defaultHideCols.hideSearch?.[b]?.order ?? 0),
                        )
                        .map((key) => (
                          <Col key={key} span={24}>
                            <Checkbox value={key}>
                              {typeof defaultHideCols.hideSearch?.[key]?.title === 'function'
                                ? defaultHideCols.hideSearch?.[key]?.title?.()
                                : defaultHideCols.hideSearch?.[key].title}
                            </Checkbox>
                          </Col>
                        ))}
                    </Row>
                  </Checkbox.Group>
                }
                trigger="click"
                placement="bottomRight"
              >
                <Tooltip title="过滤项设置">
                  <div className={`${prefixCls}-pro-table-list-toolbar-setting-item`}>
                    <FilterOutlined />
                  </div>
                </Tooltip>
              </Popover>
            ) : null,
          ],
        }}
        onChange={(changePagination) => {
          const { pageSize } = changePagination || {};
          if (pageSize && pageSize !== cacheHideCols?.defaultPageSize) {
            setCacheHideCols((prev) => ({
              ...prev,
              defaultPageSize: pageSize,
            }));
          }
        }}
        onDataSourceChange={onDataSourceChange}
      />
      {contextHolder}
    </ProProvider.Provider>
  );
}

export default ProTable;
