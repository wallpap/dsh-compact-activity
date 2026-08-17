import type { LocaleDictOf } from '@deepseek-ai/dsh-client-ui-slots';
export declare const ACTIVITY_NS: "compact-activity";
export type CompactActivityKey = 'status.running' | 'status.done' | 'status.error' | 'status.thinking' | 'status.toolRunning' | 'count.thought' | 'count.thoughts' | 'count.toolCall' | 'count.toolCalls';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        'compact-activity': CompactActivityKey;
    }
}
export declare const zh: LocaleDictOf<typeof ACTIVITY_NS>;
export declare const en: LocaleDictOf<typeof ACTIVITY_NS>;
//# sourceMappingURL=locales.d.ts.map