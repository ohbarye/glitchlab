export type MaskMode = "none" | "rect" | "brush";

interface BaseParam {
  id: string;
  label: string;
}

interface RangeParam extends BaseParam {
  type: "range";
  min: number;
  max: number;
  step: number;
  default: number;
}

interface SelectParam extends BaseParam {
  type: "select";
  options: string[];
  default: string;
}

interface CheckboxParam extends BaseParam {
  type: "checkbox";
  default: boolean;
}

export type EffectParam = RangeParam | SelectParam | CheckboxParam;

export interface EffectModule {
  id: string;
  name: string;
  params: EffectParam[];
  apply(
    imageData: ImageData,
    params: Record<string, number | string | boolean>,
  ): ImageData;
}

export interface EffectState {
  enabled: boolean;
  params: Record<string, number | string | boolean>;
}
