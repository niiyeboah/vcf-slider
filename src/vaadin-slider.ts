import { html, css, property, customElement } from 'lit-element';
import { VaadinElement } from '@vaadin/element-base';

/**
 * `<vaadin-slider>` Slider web component for the Vaadin platform.
 *
 * @attr element-attr - Attribute description.
 *
 * @slot element-slot - Slot description.
 *
 * @csspart element-part - Element part description.
 *
 * @event custom-event - Custom event description.
 */
@customElement('vaadin-slider')
export class VaadinSlider extends VaadinElement {
  static get is() {
    return 'vaadin-slider';
  }

  static get version() {
    return '1.0.0';
  }

  @property({ type: String }) title = 'Hey there';

  @property({ type: Number }) counter = 5;

  static get styles() {
    return css`
      :host {
        display: block;
        padding: 25px;
        color: var(--vaadin-slider-text-color, #000);
      }
    `;
  }

  render() {
    return html`
      <h2>${this.title} #${this.counter}!</h2>
      <button @click=${this.increment}>increment</button>
    `;
  }

  private increment() {
    this.counter += 1;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vaadin-slider': VaadinSlider;
  }
}
