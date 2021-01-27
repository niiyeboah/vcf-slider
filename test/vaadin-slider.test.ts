import { html, fixture, expect } from '@open-wc/testing';

import { VaadinSlider } from '../vaadin-slider.js';

describe('VaadinSlider', () => {
  it('can override the title via attribute', async () => {
    const el: VaadinSlider = await fixture(html` <vaadin-slider title="attribute title"></vaadin-slider> `);

    expect(el.title).to.equal('attribute title');
  });

  it('passes the a11y audit', async () => {
    const el: VaadinSlider = await fixture(html` <vaadin-slider></vaadin-slider> `);

    await expect(el).shadowDom.to.be.accessible();
  });
});
