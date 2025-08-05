// global.d.ts
import * as $ from 'jquery';

declare global {
    var $: typeof $;
    var jQuery: typeof $;
}