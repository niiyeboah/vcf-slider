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
 * `<vcf-slider>` Slider web component for the Vaadin platform.
 *
 * @csspart container - Wrapper element.
 * @csspart line - Line element.
 * @csspart knob - Knob elements.
 * @csspart knob-n - Nth knob element.
 */
@customElement('vcf-slider')
export class VcfSlider extends LitElement {
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
    return '1.0.2';
  }

  static get styles() {
    return css`
      :host {
        display: block;
        margin: var(--lumo-space-s) 0;
        --vcf-slider-padding: var(--lumo-space-xs);
        --vcf-slider-line-width: calc(100% - 2 * var(--vcf-slider-padding));
        --vcf-slider-line-height: var(--lumo-space-s);
        --vcf-slider-knob-size: var(--lumo-space-m);
        --vcf-slider-line-color: var(--lumo-contrast-50pct);
        --vcf-slider-line-alternate-color: var(--lumo-contrast-30pct);
        --vs-l-height: var(--vcf-slider-line-height);
        --vs-k-size: var(--vcf-slider-knob-size);
      }

      [part='container'] {
        width: var(--vcf-slider-line-width);
        padding: var(--vcf-slider-padding);
      }

      [part='line'] {
        position: relative;
        width: 100%;
        height: var(--vcf-slider-line-height);
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
        width: var(--vcf-slider-knob-size);
        height: var(--vcf-slider-knob-size);
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
          this.knobIndexes.forEach(i => {
            this.setAriaValues(i);
            this.setLabelPosition(i);
            this.setKnobPostion(i);
            this.setLineColors();
          });

          // TODO Add events...
          this.dispatchEvent(new CustomEvent('change', { detail: this.value }));
          break;
        }
      }
    });
  }

  private setLabelValues() {
    const { knobIndexes, values } = this;
    knobIndexes.forEach(i => {
      const labelElement = this.labelElement(i) as HTMLElement;
      if (labelElement) labelElement.innerText = `${values[i]}`;
    });
  }

  private setAriaValues(i = 0) {
    const { values, knobs, min, max } = this;
    const knob = this.knobElement(i) as HTMLElement;
    if (knob) {
      knob.setAttribute('aria-valuenow', `${values[i]}`);
      knob.setAttribute('aria-valuemin', `${knobs === 1 ? min : this.getPrevNeighborValue(i)}`);
      knob.setAttribute('aria-valuemax', `${knobs === 1 ? max : this.getNextNeighborValue(i)}`);
    }
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
    const lineColor = getComputedStyle(this).getPropertyValue('--vcf-slider-line-color').trim();
    const altLineColor = getComputedStyle(this).getPropertyValue('--vcf-slider-line-alternate-color').trim();
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
          this.value = this.knobs === 1 ? value : [...values];
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
        knobsContainer.appendChild(this.createKnobElement(i));
        knobsContainer.appendChild(this.createKnobLabelElement(i));
      });
    }
  }

  private createKnobElement(knobIndex: number): HTMLDivElement {
    const knobElement = document.createElement('div');
    knobElement.tabIndex = knobIndex + 1;
    knobElement.setAttribute('role', 'slider');
    knobElement.setAttribute('part', `knob knob-${knobIndex}`);
    knobElement.addEventListener('mousedown', this.startDrag);
    if (knobIndex % 2) knobElement.classList.add('alternate');
    knobElement.addEventListener('keydown', event => this.handleKnobKeyDownEvent(event, knobIndex));
    return knobElement;
  }

  private createKnobLabelElement(knobIndex: number): HTMLDivElement {
    const labelElement = document.createElement('div');
    labelElement.setAttribute('part', `label label-${knobIndex}`);
    return labelElement;
  }

  private getPrevNeighborValue(knobIndex: number) {
    const { values, step, min } = this;
    let neighboringValue;
    neighboringValue = values[knobIndex - 1];
    const neighborPrecisionOffset = neighboringValue % step;
    if (neighborPrecisionOffset) neighboringValue += step - neighborPrecisionOffset;
    return neighboringValue ? neighboringValue : min;
  }

  private getNextNeighborValue(knobIndex: number) {
    const { values, step, max } = this;
    let neighboringValue;
    neighboringValue = values[knobIndex + 1];
    const neighborPrecisionOffset = neighboringValue % step;
    if (neighborPrecisionOffset) neighboringValue -= neighborPrecisionOffset;
    return neighboringValue ? neighboringValue : max;
  }

  private decreaseKnobValue({ knobIndex, single, first = this.min, other }: KnobValueOptions) {
    if (this.knobs === 1) {
      this.value = single;
    } else {
      if (knobIndex === 0) this.values[knobIndex] = first;
      else this.values[knobIndex] = other;
      this.requestUpdate('value', [...this.values]);
    }
  }

  private increaseKnobValue({ knobIndex, single, last = this.max, other }: KnobValueOptions) {
    if (this.knobs === 1) {
      this.value = single;
    } else {
      if (knobIndex === this.knobs - 1) this.values[knobIndex] = last;
      else this.values[knobIndex] = other;
      this.requestUpdate('value', [...this.values]);
    }
  }

  private decreaseKnobValueByStep(knobIndex: number) {
    const { min, values, step } = this;
    this.decreaseKnobValue({
      knobIndex,
      // Use the smallest number between max value and requested value.
      single: Math.max(min, values[0] - step),
      // Use the smallest number between max value and requested value.
      first: Math.max(min, values[0] - step),
      // Use the smallest number between max value, requested value, and the neighboring value.
      other: Math.max(min, values[knobIndex] - step, this.getPrevNeighborValue(knobIndex))
    });
  }

  private decreaseKnobValueToLowest(knobIndex: number) {
    const { min } = this;
    this.decreaseKnobValue({
      knobIndex,
      single: min,
      first: min,
      // Use the biggest number between min value and the neighboring value.
      other: Math.max(min, this.getPrevNeighborValue(knobIndex))
    });
  }

  private increaseKnobValueByStep(knobIndex: number) {
    const { step, max, values } = this;
    this.increaseKnobValue({
      knobIndex,
      // Use the smallest number between max value and requested value.
      single: Math.min(max, values[0] + step),
      // Use the smallest number between max value and requested value.
      last: Math.min(max, values[knobIndex] + step),
      // Use the smallest number between max value, requested value, and the neighboring value.
      other: Math.min(max, values[knobIndex] + step, this.getNextNeighborValue(knobIndex))
    });
  }

  private increaseKnobValueToHighest(knobIndex: number) {
    const { max } = this;
    this.increaseKnobValue({
      knobIndex,
      single: max,
      last: max,
      // Use the smallest number between max value and the neighboring value.
      other: Math.min(this.max, this.getNextNeighborValue(knobIndex))
    });
  }

  private handleKnobKeyDownEvent(event: KeyboardEvent, knobIndex: number) {
    let flag = false;
    const key = event.key || event.keyCode;
    switch (key) {
      case 'ArrowLeft':
      case 37:
      case 'ArrowDown':
      case 40:
        this.decreaseKnobValueByStep(knobIndex);
        flag = true;
        break;

      case 'ArrowRight':
      case 39:
      case 'ArrowUp':
      case 38:
        this.increaseKnobValueByStep(knobIndex);
        flag = true;
        break;

      case 'Home':
      case 36:
        this.decreaseKnobValueToLowest(knobIndex);
        flag = true;
        break;

      case 'End':
      case 35:
        this.increaseKnobValueToHighest(knobIndex);
        flag = true;
        break;

      default:
        break;
    }
    if (flag) {
      event.preventDefault();
      event.stopPropagation();
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
    'vcf-slider': VcfSlider;
  }
}

interface KnobValueOptions {
  knobIndex: number;
  single: number;
  first?: number;
  last?: number;
  other: number;
}
