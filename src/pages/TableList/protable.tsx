import ProTable from '@/components/ProTable/ProTable';
import { rule } from '@/services/ant-design-pro/api';
import { PlusOutlined } from '@ant-design/icons';
import type { ActionType } from '@ant-design/pro-components';
import { PageContainer } from '@ant-design/pro-components';
import { FormattedMessage, history, useIntl } from '@umijs/max';
import { Button } from 'antd';
import React, { useRef } from 'react';

const TableList: React.FC = () => {
  const actionRef = useRef<ActionType>();

  /**
   * @en-US International configuration
   * @zh-CN 国际化配置
   * */
  const intl = useIntl();

  return (
    <PageContainer>
      <ProTable
        headerTitle={intl.formatMessage({
          id: 'pages.searchTable.title',
          defaultMessage: 'Enquiry form',
        })}
        actionRef={actionRef}
        rowKey="key"
        search={{
          labelWidth: 120,
        }}
        toolBarRender={() => [
          <Button type="primary" key="primary">
            <PlusOutlined /> <FormattedMessage id="pages.searchTable.new" defaultMessage="New" />
          </Button>,
        ]}
        request={async (params, sort, filter) => {
          console.log(params, sort, filter);

          return await rule(params, sort);
        }}
        columns={[
          {
            title: (
              <FormattedMessage
                id="pages.searchTable.updateForm.ruleName.nameLabel"
                defaultMessage="Rule name"
              />
            ),
            dataIndex: 'name',
            tooltip: 'The rule name is the unique key',
            render: (dom, entity) => {
              return (
                <a
                  onClick={() => {
                    history.push(`/list/detail/${entity.key}`);
                  }}
                >
                  {dom}
                </a>
              );
            },
          },
          {
            title: (
              <FormattedMessage id="pages.searchTable.titleDesc" defaultMessage="Description" />
            ),
            dataIndex: 'desc',
            valueType: 'textarea',
          },
          {
            title: '服务调用次数',
            dataIndex: 'callNo',
            valueType: 'moneyRange',
          },
          {
            title: '服务调用次数',
            dataIndex: 'callNo',
            valueType: 'numberRange',
          },
          {
            title: <FormattedMessage id="pages.searchTable.titleStatus" defaultMessage="Status" />,
            dataIndex: 'status',
            hideInForm: true,
            valueType: 'select',
            fieldProps: { showSearch: true },
            // valueEnum: (row) => ({ 1: '1', 2: '2', 3: '3' }),
            valueEnum: {
              4: (
                <>
                  <FormattedMessage
                    id="pages.searchTable.nameStatus.default"
                    defaultMessage="Shut down"
                  />
                  333{' '}
                </>
              ),
              0: {
                text: '正常',
                status: 'Default',
              },
              1: {
                text: '运行中',
                status: 'Processing',
              },
              2: {
                text: '已上线',
                status: 'Success',
              },
              3: {
                text: '异常',
                status: 'Error',
              },
              5: {
                text: '关闭',
                status: 'Error',
              },
            },
          },
          {
            title: (
              <FormattedMessage
                id="pages.searchTable.titleUpdatedAt"
                defaultMessage="Last scheduled time"
              />
            ),
            sorter: true,
            dataIndex: 'updatedAt',
            // valueType: 'dateBeginEnd',
            valueType: 'dateBeginEnd',

            // renderFormItem: (item, { defaultRender, ...rest }, form) => {
            //   const status = form.getFieldValue('status');
            //   if (`${status}` === '0') {
            //     return false;
            //   }
            //   if (`${status}` === '3') {
            //     return (
            //       <Input
            //         {...rest}
            //         placeholder={intl.formatMessage({
            //           id: 'pages.searchTable.exception',
            //           defaultMessage: 'Please enter the reason for the exception!',
            //         })}
            //       />
            //     );
            //   }
            //   return defaultRender(item);
            // },
          },
          {
            title: (
              <FormattedMessage id="pages.searchTable.titleOption" defaultMessage="Operating" />
            ),
            dataIndex: 'option',
            valueType: 'option',
            render: (_, record) => [
              <a key="config">
                <FormattedMessage id="pages.searchTable.config" defaultMessage="Configuration" />
              </a>,
            ],
          },
        ]}
        rowSelection={{
          onChange: (_, selectedRows) => {},
        }}
      />
    </PageContainer>
  );
};

export default TableList;
