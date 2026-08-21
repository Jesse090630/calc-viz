/**
 * ENGINE — 推导链的数据模型
 *
 * ⚠️ 本目录(src/engine/)禁止出现任何具体数学概念的名字。
 *    引擎必须对所有概念通用;加新概念时如果发现要改这里,说明抽象错了。
 *    该规则由 src/math/architecture.test.ts 自动检查。
 *
 * 核心设计:**Stage 是数据,不是代码**。
 * 一个概念 = 一个 stages 数组 + 少量该概念专用的场景组件。引擎不动。
 */

/** 运行时可调参数。键名由各概念自行定义,引擎只负责搬运。 */
export type Params = Readonly<Record<string, number>>;

/** 相机预设。这是通用的取景方式,不含任何概念语义。 */
export type CameraPreset = 'front' | 'three-quarter' | 'wide' | 'top' | 'free';

/** 一个可拖动的参数。UI 由 ControlPanel 自动生成。 */
export interface ControlSpec {
  readonly param: string;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  /** 数值显示方式。缺省为保留两位小数。 */
  readonly format?: (value: number) => string;
}

/** 公式面板的一行。tex 可以是常量,也可以随参数实时变化。 */
export interface FormulaLine {
  readonly tex: string | ((params: Params) => string);
  /** true = 这一行是本步正在变化的量。一个 stage 里最多高亮一行。 */
  readonly highlight?: boolean;
}

/**
 * 进入某一步时自动播放的参数补间。
 *
 * 这是"相机移动与物体运动绝不同时发生"这条纪律的**声明式表达**:
 * 用 delayMs 把物体的运动推迟到相机过渡结束之后,而不是靠写代码时自觉。
 */
export interface Autoplay {
  readonly param: string;
  readonly from: number;
  readonly to: number;
  /** 延迟多久才开始动(留给相机过渡) */
  readonly delayMs: number;
  /** 全程时长(有 steps 时是走完所有档位的总时长) */
  readonly durationMs: number;
  /**
   * 逐级跳而不是连续补间。
   * 两个用处:①有些量本来就该离散地看(例如"n 每翻倍误差缩到 1/4",
   * 连续爬升反而会把倍增关系糊掉);②避免每帧重建重型几何。
   * 必须以 from 开头、以 to 结尾(validateChain 会检查)。
   */
  readonly steps?: readonly number[];
}

/** 推导链的一步 */
export interface Stage {
  /** 稳定 id,链内唯一 */
  readonly id: string;
  /** 显示给用户的步号,如 "1" / "5b"。允许非整数编号,方便插入补充步骤。 */
  readonly label: string;
  readonly title: string;
  /** 一句话:上一步【怎么】变成这一步。写不出来说明这一步该拆。 */
  readonly narration: string;
  /** WebGL 场景的一句文字等价描述,供屏幕阅读器理解画面。 */
  readonly altText?: string;
  /** 本步显示哪些场景对象(id 由各概念自行约定) */
  readonly show: readonly string[];
  readonly camera: CameraPreset;
  /** 进入本步时把这些参数设成指定值(不写的沿用链的默认值) */
  readonly params?: Params;
  readonly controls?: readonly ControlSpec[];
  readonly formula?: readonly FormulaLine[];
  readonly autoplay?: Autoplay;
}

/** 一条完整的推导链 = 一个数学概念 */
export interface Chain {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  /** 所有参数的初值。每个用到的参数都必须在这里出现(validateChain 会检查)。 */
  readonly defaultParams: Params;
  readonly stages: readonly Stage[];
}

/** 场景渲染器由外部注入 —— 引擎因此不需要知道任何图形细节。 */
export interface SceneProps {
  readonly stage: Stage;
  readonly params: Params;
  /** 便捷判断:本步是否显示某个对象 */
  readonly visible: (objectId: string) => boolean;
}
