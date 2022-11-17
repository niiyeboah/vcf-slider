import { fixture, expect } from '@open-wc/testing';
import { html } from 'lit/static-html.js';
import { Slider } from '../src/vcf-slider.js';
import '../vcf-slider.js';

describe('VcfSlider', () => {
  it('passes the a11y audit', async () => {
    const el: Slider = await fixture(html`<vcf-slider></vcf-slider>`);

    await expect(el).shadowDom.to.be.accessible();
  });
});
