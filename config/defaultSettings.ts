import { ProLayoutProps } from '@ant-design/pro-components';

export const QIAN_KUN_APP_NAME = 'weworkconsole';
export const QIAN_KUN_APP_TITLE = '幼幼家园管理后台';
export const QIAN_KUN_APP_PRIMARY_COLOR = '#09BB07';

/**
 * @name
 */
const Settings: ProLayoutProps & {
  pwa?: boolean;
  logo?: string;
} = {
  navTheme: 'light',
  // 拂晓蓝
  colorPrimary: '#1890ff',
  layout: 'mix',
  contentWidth: 'Fluid',
  fixedHeader: false,
  fixSiderbar: true,
  colorWeak: false,
  title: 'Ant Design Pro',
  pwa: true,
  logo: 'https://gw.alipayobjects.com/zos/rmsportal/KDpgvguMpGfqaHPjicRK.svg',
  iconfontUrl: '',
  token: {
    // 参见ts声明，demo 见文档，通过token 修改样式
    //https://procomponents.ant.design/components/layout#%E9%80%9A%E8%BF%87-token-%E4%BF%AE%E6%94%B9%E6%A0%B7%E5%BC%8F
  },

  ...(QIAN_KUN_APP_NAME
    ? {
        colorPrimary: QIAN_KUN_APP_PRIMARY_COLOR,
        headerRender: false, // 顶部菜单
        footerRender: false, // 页脚
        fixedHeader: false,
        fixSiderbar: false, // 固定左侧菜单
        splitMenus: false, // 自动分割菜单到顶部
        menuHeaderRender: false,
        siderMenuType: 'sub',
        token: {
          bgLayout: false,
          sider: { colorMenuBackground: '#fff' },
        },
        contentStyle: {
          paddingTop: 4,
          backgroundColor: '#fff',
        },
        pageTitleRender: (basicLayoutProps) => {
          // console.log(basicLayoutProps);
          return QIAN_KUN_APP_TITLE;
        },
      }
    : {}),
};

export default Settings;
