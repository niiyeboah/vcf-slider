import { html, css, query, customElement, property, internalProperty, PropertyValues, LitElement } from 'lit-element';

type PointerEvent = MouseEvent | TouchEvent;
const TOUCH_DEVICE = (() => {
  try {
    document.createEvent('TouchEvent');
    return true;
  } catch (e) {
    return false;
  }
})();

/**
 * `<vaadin-slider>` Slider web component for the Vaadin platform.
 *
 * @csspart container - Wrapper element.
 * @csspart line - Line element.
 * @csspart knob - Knob elements.
 * @csspart knob-n - Nth knob element.
 */
@customElement('vaadin-slider')
export class VaadinSlider extends LitElement {
  @property({ type: Boolean, reflect: true }) labels = true;
  @property({ type: Number }) value: number | number[] = 0;
  @property({ type: Number }) ranges = 0;
  @property({ type: Number }) step = 1;
  @property({ type: Number }) min = 0;
  @property({ type: Number }) max = 100;
  @internalProperty() private knobs = 1;
  private touchDevice = TOUCH_DEVICE;
  private knob?: HTMLElement;
  private originalKnobOffsetX = 0;
  private originalPointerX = 0;

  @query('[part="knobs"]') private knobsContainer?: HTMLElement;
  @query('[part="line"]') private line?: HTMLElement;
  @query('[part="line-color"]') private lineColor?: HTMLElement;

  static get version() {
    return '1.0.0';
  }

  static get styles() {
    return css`
      :host {
        display: block;
        margin: var(--lumo-space-s) 0;
        --vaadin-slider-padding: var(--lumo-space-xs);
        --vaadin-slider-line-width: calc(100% - 2 * var(--vaadin-slider-padding));
        --vaadin-slider-line-height: var(--lumo-space-s);
        --vaadin-slider-knob-size: var(--lumo-space-m);
        --vaadin-slider-line-color: var(--lumo-contrast-50pct);
        --vaadin-slider-line-alternate-color: var(--lumo-contrast-30pct);
        --vs-l-height: var(--vaadin-slider-line-height);
        --vs-k-size: var(--vaadin-slider-knob-size);
      }

      [part='container'] {
        width: var(--vaadin-slider-line-width);
        padding: var(--vaadin-slider-padding);
      }

      [part='line'] {
        position: relative;
        width: 100%;
        height: var(--vaadin-slider-line-height);
        border-radius: var(--lumo-border-radius-m);
        background-color: var(--lumo-contrast-30pct);
      }

      [part='line-color'] {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        border-radius: var(--lumo-border-radius-m);
      }

      [part~='knob'] {
        position: absolute;
        top: calc(-0.5 * var(--vs-k-size) + calc(0.5 * var(--vs-l-height)));
        width: var(--vaadin-slider-knob-size);
        height: var(--vaadin-slider-knob-size);
        border-radius: var(--lumo-border-radius-l);
        box-shadow: var(--lumo-box-shadow-s);
        user-select: none;
        background-color: var(--lumo-primary-color);
      }

      [part~='knob'].alternate {
        background-color: var(--lumo-error-color);
      }

      [part~='label'] {
        display: none;
        position: absolute;
        top: calc(-0.5 * var(--vs-k-size) + calc(0.5 * var(--vs-l-height)) - calc(2 * var(--lumo-space-m)));
        border-radius: var(--lumo-border-radius-s);
        box-shadow: var(--lumo-box-shadow-xs);
        background-color: var(--lumo-base-color);
        padding: 0 var(--lumo-space-s);
        font-size: var(--lumo-font-size-s);
      }

      :host([labels]) [part~='label'] {
        display: block;
      }
    `;
  }

  render() {
    return html`
      <div part="container">
        <div part="line">
          <div part="line-color"></div>
          <div part="knobs"></div>
        </div>
      </div>
    `;
  }

  updated(props: PropertyValues) {
    props.forEach(async (_, prop) => {
      switch (prop) {
        case 'labels': {
          if (this.labels) this.style.paddingTop = 'var(--lumo-space-l)';
          else this.style.paddingTop = '0';
          break;
        }
        case 'ranges': {
          const { ranges } = this;
          if (typeof ranges === 'number' && ranges >= 0) this.knobs = 2 * ranges || 1;
          else this.ranges = 0;
          break;
        }
        case 'min':
        case 'max':
        case 'knobs': {
          if (this.knobs) {
            this.setKnobElements();
            this.setInitialValue();
          }
          break;
        }
        case 'step': {
          const { step } = this;
          if (step.toString().includes('.')) this.step = Math.round(step);
          if (step < 1) this.step = 1;
          break;
        }
        case 'value': {
          this.setLabelValues();
          this.knobIndexes.forEach(i => this.setLabelPosition(i));
          break;
        }
      }
    });
  }

  private setLabelValues() {
    const { knobIndexes, values } = this;
    knobIndexes.forEach(i => {
      const labelElement = this.labelElement(i) as HTMLElement;
      if (this.labelElement(i)) labelElement.innerText = `${values[i]}`;
    });
  }

  private get initialValue() {
    const { knobs, min, max, step } = this;
    const valueStep = (max - min) / (knobs - 1);
    const values: number[] = [];
    this.knobIndexes.map(i => {
      let init = Math.round(i === 0 ? min : i < knobs - 1 ? i * valueStep : max);
      init = init - (init % step);
      values.push(init < min ? min : init > max ? max : init);
    });
    return values;
  }

  private get values() {
    const { value } = this;
    return (Array.isArray(value) ? value : [value || 0]) as number[];
  }

  private setInitialValue() {
    this.value = this.initialValue;
    this.knobIndexes.map(i => this.setKnobPostion(i));
    this.setLineColors();
  }

  private setKnobPostion(i = 0) {
    const { min, max, values } = this;
    const lineWidth = this.lineBounds!.width;
    const knob = this.knobElement(i) as HTMLElement;
    if (knob) {
      const knobWidth = this.getBounds(knob).width;
      const position = ((values[i] - min) / (max - min)) * lineWidth - knobWidth / 2;
      knob.style.left = `${position}px`;
    }
  }

  private setLabelPosition(i = 0) {
    const { min, max, values } = this;
    const lineWidth = this.lineBounds!.width;
    const label = this.labelElement(i) as HTMLElement;
    if (label) {
      const labelWidth = this.getBounds(label).width;
      const position = ((values[i] - min) / (max - min)) * lineWidth - labelWidth / 2;
      label.style.left = `${position}px`;
    }
  }

  private setLineColors() {
    const { knobs, min, max, values } = this;
    const length = max - min;
    const lineColor = getComputedStyle(this).getPropertyValue('--vaadin-slider-line-color').trim();
    const altLineColor = getComputedStyle(this).getPropertyValue('--vaadin-slider-line-alternate-color').trim();
    let colors = '';
    let prevStop = '';
    const color = (i: number) => (i % 2 ? lineColor : knobs > 3 ? 'transparent' : altLineColor);
    values.forEach((value, i) => {
      const adjustedValue = value - min < 0 ? 0 : value - min;
      const stop = `${(adjustedValue / length) * 100}%`;
      if (i === 0) colors += `${knobs === 1 ? lineColor : 'transparent'} ${stop}, `;
      else colors += `${color(i)} ${prevStop} ${stop}, `;
      prevStop = stop;
    });
    colors += `transparent ${prevStop} 100%`;
    this.lineColor!.style.background = `linear-gradient(to right, ${colors})`;
  }

  private getKnobIndex(knob: HTMLElement) {
    const idMatch = /knob-(.)/.exec(knob.getAttribute('part') || '');
    return idMatch ? Number(idMatch[1]) : 0;
  }

  private startDrag = (e: PointerEvent) => {
    this.knob = e.target as HTMLElement;
    const { knob, label, knobsContainer } = this;
    const button = (e as MouseEvent).button;
    const touches = (e as TouchEvent).touches;

    this.originalPointerX = (e as MouseEvent).pageX;
    this.originalKnobOffsetX = this.getBounds(knob).x - this.lineBounds!.x;
    if (button === 0 || touches) {
      window.addEventListener('mouseup', this.endDrag);
      window.addEventListener('touchend', this.endDrag);
      window.addEventListener('mousemove', this.drag);
      window.addEventListener('touchmove', this.drag);
    }

    // Move current knob and label to top
    knobsContainer?.appendChild(knob);
    knobsContainer?.appendChild(label);
  };

  private drag = (e: PointerEvent) => {
    const { knob, knobs, originalKnobOffsetX, originalPointerX, line, lineBounds } = this;
    if (knob) {
      const i = this.getKnobIndex(knob);
      const knobBounds = this.getBounds(knob);
      let startX = -knobBounds.width / 2;
      let endX = lineBounds!.width - knobBounds.width / 2;
      const part = `knob-${i}`;

      // Set knob limits
      switch (part) {
        case 'knob-0': {
          if (knobs > 1) {
            const toKnob = line!.querySelector('[part~="knob-1"]') as HTMLElement;
            endX = this.getBounds(toKnob).x - lineBounds!.x;
          }
          break;
        }
        case `knob-${knobs - 1}`: {
          if (knobs > 1) {
            const fromKnob = line!.querySelector(`[part~="knob-${knobs - 2}"]`) as HTMLElement;
            startX = this.getBounds(fromKnob).x - lineBounds!.x;
          }
          break;
        }
        default: {
          const fromKnob = line!.querySelector(`[part~="knob-${i - 1}"]`) as HTMLElement;
          const toKnob = line!.querySelector(`[part~="knob-${i + 1}"]`) as HTMLElement;
          startX = this.getBounds(fromKnob).x - lineBounds!.x;
          endX = this.getBounds(toKnob).x - lineBounds!.x;
        }
      }

      // Calculate knob position
      let newPositionX = originalKnobOffsetX + ((e as MouseEvent).pageX - originalPointerX);
      const startLimit = newPositionX <= startX;
      const endLimit = newPositionX >= endX;
      newPositionX = startLimit ? startX : endLimit ? endX : newPositionX;

      // Calculate new value
      const { min, max, step, values } = this;
      const length = max - min;
      const pct = (newPositionX + knobBounds.width / 2) / lineBounds!.width;
      const value = Math.round(pct * length + min);

      // Step
      if (value === min || (value > min && Math.abs(value) % step === 0)) {
        // Set new value & knob position
        if (values[i] !== value) {
          values[i] = value;
          this.value = [...values];
          this.setKnobPostion(i);
        }

        // Change line colors
        this.setLineColors();
      }
    }
  };

  private endDrag = () => {
    window.removeEventListener('mouseup', this.endDrag);
    window.removeEventListener('touchend', this.endDrag);
    window.removeEventListener('mousemove', this.drag);
    window.removeEventListener('touchmove', this.drag);
  };

  private get label() {
    const i = this.knob ? this.getKnobIndex(this.knob) : 0;
    return this.labelElement(i) as HTMLElement;
  }

  private labelElement(i = 0) {
    return this.shadowRoot?.querySelector(`[part~=label-${i}]`) as HTMLElement;
  }

  private knobElement(i = 0) {
    return this.shadowRoot?.querySelector(`[part~=knob-${i}]`);
  }

  private get knobIndexes() {
    return Array.from({ length: this.knobs }, (_, i) => i);
  }

  private setKnobElements() {
    const { knobs, knobIndexes, knobsContainer } = this;
    if (knobs && knobsContainer) {
      knobsContainer.innerHTML = '';
      knobIndexes.map(i => {
        const knobElement = document.createElement('div');
        const labelElement = document.createElement('div');
        if (i % 2) knobElement.classList.add('alternate');
        knobElement.setAttribute('part', `knob knob-${i}`);
        knobElement.addEventListener('mousedown', this.startDrag);
        labelElement.setAttribute('part', `label label-${i}`);
        knobsContainer?.appendChild(knobElement);
        knobsContainer?.appendChild(labelElement);
      });
    }
  }

  private getBounds(el: HTMLElement) {
    return el.getBoundingClientRect();
  }

  private get lineBounds() {
    return this.getBounds(this.line!);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vaadin-slider': VaadinSlider;
  }
}
