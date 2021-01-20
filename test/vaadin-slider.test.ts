import { html, fixture, expect } from '@open-wc/testing';

import { VaadinSlider } from '../vaadin-slider.js';

describe('VaadinSlider', () => {
  it('has a default title "Hey there" and counter 5', async () => {
    const el: VaadinSlider = await fixture(html` <vaadin-slider></vaadin-slider> `);

    expect(el.title).to.equal('Hey there');
    expect(el.counter).to.equal(5);
  });

  it('increases the counter on button click', async () => {
    const el: VaadinSlider = await fixture(html` <vaadin-slider></vaadin-slider> `);
    el.shadowRoot!.querySelector('button')!.click();

    expect(el.counter).to.equal(6);
  });

  it('can override the title via attribute', async () => {
    const el: VaadinSlider = await fixture(html` <vaadin-slider title="attribute title"></vaadin-slider> `);

    expect(el.title).to.equal('attribute title');
  });

  it('passes the a11y audit', async () => {
    const el: VaadinSlider = await fixture(html` <vaadin-slider></vaadin-slider> `);

    await expect(el).shadowDom.to.be.accessible();
  });
});
