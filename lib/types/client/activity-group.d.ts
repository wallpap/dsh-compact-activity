import type { ChatNodeStore } from '@deepseek-ai/dsh-client-runtime/client';
/** 一组连续的 DSH 官方过程行。 */
export interface ActivityGroup {
    readonly firstKey: string;
    /** 所有包含过程项的行；可能包含同时承载正文的边界行。 */
    readonly keys: readonly string[];
    /** 此行的模型正文保持可见，只折叠其中的官方 Think 子项。 */
    readonly partialKey?: string;
    /** 最新过程项所在行；进行中时从该行复用官方摘要。 */
    readonly latestKey: string;
    readonly latestKind: 'reasoning' | 'tool';
    readonly reasoningCount: number;
    readonly toolCount: number;
    /** 过程内失败或中断的思考／工具步骤数。 */
    readonly failureCount: number;
    readonly running: boolean;
    /** 仅表示最后一个过程项异常结束；历史失败由 failureCount 保留。 */
    readonly error: boolean;
}
/** 只为至少包含两个过程项的连续列表创建总折叠。 */
export declare function activityGroups(order: readonly string[], store: ChatNodeStore): readonly ActivityGroup[];
//# sourceMappingURL=activity-group.d.ts.map