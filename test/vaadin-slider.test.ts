import { html, fixture, expect } from '@open-wc/testing';

import { VcfSlider } from '../src/vcf-slider.js';

describe('VcfSlider', () => {
  it('can override the title via attribute', async () => {
    const el: VcfSlider = await fixture(html` <vcf-slider title="attribute title"></vcf-slider> `);

    expect(el.title).to.equal('attribute title');
  });

  it('passes the a11y audit', async () => {
    const el: VcfSlider = await fixture(html` <vcf-slider></vcf-slider> `);

    await expect(el).shadowDom.to.be.accessible();
  });
});
