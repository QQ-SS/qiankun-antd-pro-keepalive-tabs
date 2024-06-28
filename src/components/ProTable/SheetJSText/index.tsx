import { css } from '@emotion/css';
import type { PresetColorType } from 'antd/es/_util/colors';
// https://stackoverflow.com/questions/28269669/css-pseudo-elements-in-react

/*
1、
<style dangerouslySetInnerHTML={{
  __html: [
     '.my-special-div:after {',
     '  content: "Hello";',
     '  position: absolute',
     '}'
    ].join('\n')
  }}>
</style>
<div className='my-special-div'></div>

2、
<span class="something" data-customattribute="👋">
  Hello
</span>
.something::before {
  content: attr(data-customattribute);
  position: absolute;
}
*/

const className = {
  icon: css`
    &::before {
      display: inline-block;
      height: auto;
      margin-right: 4px;
      padding: 2px;
      font-size: 12px;
      line-height: 14px;
      border: 1px solid #d9d9d9;
      border-radius: 2px;
      content: attr(data-icon);
    }

    &.red::before {
      color: #cf1322;
      background: #fff1f0;
      border-color: #ffa39e;
    }

    &.green::before {
      color: #389e0d;
      background: #f6ffed;
      border-color: #b7eb8f;
    }
  `,
  description: css`
    &::after {
      display: inline-block;
      margin-left: 8px;
      color: rgba(0, 0, 0, 0.45);
      font-size: 12px;
      line-height: 14px;
      content: attr(data-description);
    }
  `,
};

export type SheetJSTextProps = {
  icon?: string;
  iconColor?: PresetColorType; // 假设PresetColorType已经定义在某个地方
  description?: string;
  style?: React.CSSProperties;
  // children?: React.ReactNode; // 添加children的类型定义
};

/**
 * 用于 table_to_sheet 导出时隐藏 icon、description 文本
 * icon : 左侧图标字符（导出时隐藏）
 * description : 右侧备注字符（导出时隐藏）
 */
function SheetJSText({
  icon,
  iconColor,
  description,
  children,
  ...rest
}: React.PropsWithChildren<SheetJSTextProps>) {
  return (
    <span
      {...rest}
      className={`${icon ? className.icon : ''} ${iconColor ?? ''} ${
        description ? className.description : ''
      }`}
      data-icon={icon}
      data-description={description}
    >
      {children}
    </span>
  );
}
export default SheetJSText;
