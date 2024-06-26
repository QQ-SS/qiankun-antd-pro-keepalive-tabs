import { DateRangeDefaultPresets } from '@/components//RangePicker/DateRange';
import PinYinSearchSelect from '@/components/Select/PinYinSearchSelect';
import { keyLookup, transformOption as transformOptions } from '@/utils';
import type {
  ProColumnType as AntProColumnType,
  ProTableProps as AntProTableProps,
  ColumnsState,
} from '@ant-design/pro-components';
import {
  ProTable as AntProTable,
  ProFormDigitRange,
  ProProvider,
} from '@ant-design/pro-components';
import type { EventEmitter } from 'ahooks/lib/useEventEmitter';
import { Radio, Tag } from 'antd';
import React, { useContext, useMemo, useState } from 'react';

type ValueType = 'tags' | 'dateBeginEnd' | 'moneyRange' | 'numberRange' | 'boolean';

interface ProColumnType<T, ValueType> extends Omit<AntProColumnType<T, ValueType>, 'children'> {
  children?: ProColumns<T>[];

  /** 在表格中完全移除 */
  proRemoveInTable?: boolean;
  /** 默认在列中隐藏 */
  proHideInTableColumns?: boolean;
  /** 默认在搜索表单中隐藏 */
  proHideInSearch?: boolean;
}

interface ProTableHideCols {
  defaultPageSize?: number;
  hideCol?: Record<string, ColumnsState>;
  hideSearch?: Record<string, ColumnsState & { title: React.ReactNode }>;
}

interface ProTableEventType {
  cacheHideCols?: ProTableHideCols;
}

export type ProColumns<DataSource> = ProColumnType<DataSource, ValueType>;

interface ProTableProps<DataSource extends Record<string, any>, Params extends Record<string, any>>
  extends Omit<AntProTableProps<DataSource, Params, ValueType>, 'columns'> {
  columns: ProColumns<DataSource>[];
  eventBus?: EventEmitter<ProTableEventType>;
}

function ProTable<
  DataSource extends Record<string, any>,
  Params extends Record<string, any> = Record<string, any>,
>(props: ProTableProps<DataSource, Params>) {
  const {
    actionRef: propsActionRef,
    formRef: propsFormRef,
    bordered = true,
    defaultSize = 'small',
    form, // = { size: "small" },
    scroll = { x: 'max-content' },
    cardProps = { bodyStyle: { padding: 0 } },
    dateFormatter = 'string',
    columns: propColumns,
    search: propSearch,
    pagination: propPagination,
    revalidateOnFocus = true, // 窗口聚焦时自动重新请求
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    columnsState: propColumnsState,
    toolbar,

    eventBus,
    exportButtonProps,
    ...restProps
  } = props;

  const [columnsStateMap, setColumnsStateMap] = useState<Record<string, ColumnsState>>({
    // name: {
    //   show: false,
    //   order: 2,
    // },
  });
  const [columnsSearchMap, setColumnsSearchMap] = useState<
    Record<string, ColumnsState & { title: React.ReactNode }>
  >({});

  const columnsSearchChecked = useMemo(() => {
    return Object.keys(columnsSearchMap).filter((key) => columnsSearchMap[key].show);
  }, [columnsSearchMap]);

  const warpColumns = (
    columns: ProColumns<DataSource>[],
  ): AntProColumnType<DataSource, ValueType>[] => {
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

        const result: AntProColumnType<DataSource, ValueType> = {
          ...restCol,
          // search,
          search: columnsSearchMap?.[key]?.show === false ? false : search, // 可以通过 columnsSearchMap 设置是否显示
          fieldProps,
          valueType,
          children: children && Array.isArray(children) ? warpColumns(children ?? []) : undefined,

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
              : entity[column.dataIndex];
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
  console.log(values);

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
      <AntProTable<DataSource, Params, ValueType>
        columns={warpColumns(propColumns)}
        {...restProps}
      />
    </ProProvider.Provider>
  );
}

export default ProTable;
