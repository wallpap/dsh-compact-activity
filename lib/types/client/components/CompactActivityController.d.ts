import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
type ControllerProps = PropsRuntime<'conversation.session.header.actions'>;
/**
 * 只向 DOM 添加总折叠。官方 DSH 过程行仍是实际内容，因此单条消息和展开后的
 * 子项继续使用官方渲染器、样式及交互。
 */
export declare function CompactActivityController({ useSession }: ControllerProps): null;
export {};
//# sourceMappingURL=CompactActivityController.d.ts.map