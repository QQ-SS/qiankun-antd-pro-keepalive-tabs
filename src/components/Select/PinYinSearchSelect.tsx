import { AutoComplete, Select } from 'antd';
import type { DefaultOptionType, SelectProps } from 'antd/es/select';
import Pinyin from 'pinyin-match';
import type { ReactNode } from 'react';
import React, { useMemo, useState } from 'react';
import { Highlighter } from './PinYinHighlighter';

export type OptionType = DefaultOptionType & {
  text?: string;
  remark?: string;
};

export type PinYinSearchSelectProps = SelectProps & {
  [x: string]: any;
  onlySelect?: boolean;
  options?: OptionType[] | Record<string | number, any>;
  optionsTransform?: (value: any[]) => any[];
  labelRender?: (option: OptionType, searchValue: string) => ReactNode;
};

export const PinYinSearchSelect = (props: PinYinSearchSelectProps) => {
  const {
    allowClear = true,
    onlySelect = true,
    showSearch = true,
    options,
    optionsTransform,
    labelRender,
    ...restProps
  } = props;
  const [searchValue, setSearchValue] = useState('');

  const pyOptions = useMemo(() => {
    const search = searchValue.toLowerCase();
    function pys(opts?: OptionType[]): OptionType[] {
      let result: OptionType[] = [];
      if (Array.isArray(opts)) {
        result = opts;
      }
      if (typeof optionsTransform === 'function') {
        result = optionsTransform(result);
      }

      if (!searchValue || !showSearch) return result;

      return result.map((opt) => {
        const { text, remark, label, options: _opts, ...rest } = opt;
        const txt = `${
          typeof text === 'string'
            ? text
            : typeof label === 'string'
            ? label
            : React.isValidElement(label)
            ? ''
            : label?.toString() ?? ''
        }${remark ?? ''}`;

        const hit = Pinyin.match(txt.toLowerCase(), search);

        return {
          ...rest,
          text,
          label:
            typeof labelRender === 'function'
              ? labelRender(opt, search)
              : typeof label === 'string' && hit && Array.isArray(hit)
              ? Highlighter(txt, hit[0], hit[1])
              : label,
          hit: txt.indexOf(search) !== -1 || !!hit,
          ...(_opts ? { options: pys(_opts) } : {}),
        };
      });
    }

    return pys(
      Array.isArray(options)
        ? options
        : Object.keys(options ?? {}).map((key) => {
            const opt = options![key];
            return typeof opt === 'string'
              ? {
                  value: key,
                  text: opt,
                }
              : typeof opt === 'object'
              ? React.isValidElement(opt)
                ? {
                    value: key,
                    label: opt,
                  }
                : {
                    ...opt,
                    value: key,
                    label: opt.label ?? opt.text,
                  }
              : {
                  value: key,
                };
          }),
    );
  }, [options, optionsTransform, searchValue, showSearch, labelRender]);

  return onlySelect ? (
    <Select
      allowClear={allowClear}
      showSearch={showSearch}
      searchValue={searchValue}
      onSearch={(value) => {
        setSearchValue(value);
      }}
      filterOption={(_, option) => {
        return !!option?.hit;
      }}
      options={pyOptions}
      {...restProps}
    />
  ) : (
    <AutoComplete
      allowClear={allowClear}
      showSearch={showSearch}
      searchValue={searchValue}
      onSearch={(value) => {
        setSearchValue(value);
      }}
      filterOption={(_, option) => {
        return !!option?.hit;
      }}
      options={pyOptions}
      {...restProps}
    />
  );
};

export default PinYinSearchSelect;
