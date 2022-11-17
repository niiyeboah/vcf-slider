import { publish, dirname } from '@vaadin-component-factory/vcf-element-util';

publish('vcf-slider', dirname(new URL('.', import.meta.url)));
