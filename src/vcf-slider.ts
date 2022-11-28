import { html, css, PropertyValues, LitElement, render, TemplateResult } from 'lit';
import { query, property, customElement } from 'lit/decorators.js';
import { CustomEventMixin, CustomEvents, ValueChangedEvent } from './mixins/CustomEventMixin';

/**
 * `<vcf-slider>` Slider web component for the Vaadin platform.
 *
 * @csspart container - Wrapper element.
 * @csspart line - Line element.
 * @csspart knob - Knob elements.
 * @csspart knob-n - Nth knob element.
 *
 * @cssprop [--vcf-slider-padding=var(--lumo-space-xs)] - Padding of `::part(container)`.
 * @cssprop [--vcf-slider-width=100%] - Width of `:host`.
 * @cssprop [--vcf-slider-line-height=var(--lumo-space-s)] - Width of `::part(line)`.
 * @cssprop [--vcf-slider-line-color=var(--lumo-contrast-50pct)] - Background color of `::part(line)`.
 * @cssprop [--vcf-slider-line-alt-color=var(--lumo-contrast-30pct)] - Secondary background color of `::part(line)`.
 * @cssprop [--vcf-slider-knob-size=var(--lumo-space-m)] - Size (width, height) of `::part(knob)`.
 * @cssprop [--vcf-slider-knob-color=var(--lumo-primary-color)] - Color of `::part(knob)`.
 * @cssprop [--vcf-slider-knob-alt-color=var(--lumo-error-color)] - Color of `::part(alt-knob)`.
 *
 * @event {ValueChangedEvent} value-changed - Fired when the slider value changes. Returns a single knob value and index.
 * @event {ValuesChangedEvent} values-changed - Fired when the slider value changes. Returns all knob values.
 */
@customElement('vcf-slider')
export class Slider extends CustomEventMixin(LitElement) {
  @property({ type: Boolean, reflect: true }) labels = false;
  @property({ type: Number }) value: string | number | number[] = 0;
  @property({ type: Number }) ranges = 0;
  @property({ type: Number }) step = 1;
  @property({ type: Number }) min = 0;
  @property({ type: Number }) max = 100;

  @query('#knobs') private knobsContainer?: HTMLElement;
  @query('#line') private line?: HTMLElement;
  @query('#line-color') private lineColor?: HTMLElement;

  protected static is() {
    return 'vcf-slider';
  }

  protected static get version() {
    return '1.0.5';
  }

  private knob?: HTMLElement;
  private originalKnobOffsetX = 0;
  private originalPointerX: number | null = 0;
  private knobCount = 1;

  private set knobs(value: number) {
    this.knobCount = value > 0 ? value : 1;
  }

  private get knobs() {
    return this.knobCount;
  }

  static get styles() {
    return css`
      :host {
        display: flex;
        margin: var(--lumo-space-s) 0;
        width: var(--vcf-slider-width);
        /* PUBLIC */
        --vcf-slider-padding: var(--lumo-space-xs);
        --vcf-slider-width: 100%;
        --vcf-slider-line-height: var(--lumo-space-s);
        --vcf-slider-line-color: var(--lumo-contrast-50pct);
        --vcf-slider-line-alt-color: var(--lumo-contrast-30pct);
        --vcf-slider-knob-size: var(--lumo-space-m);
        --vcf-slider-knob-color: var(--lumo-primary-color);
        --vcf-slider-knob-alt-color: var(--lumo-error-color);
        /* PRIVATE */
        --l-height: var(--vcf-slider-line-height);
        --k-size: calc(var(--vcf-slider-knob-size) * 2);
      }

      :host([labels]) {
        padding-top: var(--lumo-size-s);
      }

      #container {
        width: 100%;
        padding: var(--vcf-slider-padding);
      }

      #line {
        position: relative;
        width: 100%;
        height: var(--l-height);
        border-radius: var(--lumo-border-radius-m);
        background-color: var(--lumo-contrast-30pct);
      }

      #line-color {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        border-radius: var(--lumo-border-radius-m);
      }

      [part~='knob'] {
        position: absolute;
        display: flex;
        top: calc(-0.5 * var(--k-size) + calc(0.5 * var(--l-height)));
        width: var(--k-size);
        height: var(--k-size);
        user-select: none;
      }

      [part~='knob']::after {
        content: '';
        width: var(--vcf-slider-knob-size);
        height: var(--vcf-slider-knob-size);
        border-radius: var(--lumo-border-radius-l);
        box-shadow: var(--lumo-box-shadow-s);
        background-color: var(--vcf-slider-knob-color);
        margin: auto;
      }

      [part~='alt-knob']::after {
        background-color: var(--vcf-slider-knob-alt-color);
      }

      [part~='label'] {
        display: none;
        flex-flow: column;
        align-items: center;
        position: absolute;
        top: calc(-0.1 * var(--vcf-slider-knob-size) + calc(0.5 * var(--l-height)) - calc(2 * var(--lumo-space-m)));
        border-radius: var(--lumo-border-radius-s);
        box-shadow: var(--lumo-box-shadow-xs);
        background-color: var(--lumo-base-color);
        padding: 0 var(--lumo-space-s);
        font-size: var(--lumo-font-size-s);
        pointer-events: none;
        user-select: none;
      }

      [part~='label-triangle'] {
        position: relative;
        margin: 0;
        box-sizing: border-box;
        background: var(--lumo-base-color);
      }

      [part~='label-triangle']::after {
        content: '';
        position: absolute;
        left: -4px;
        width: 0;
        height: 0;
        box-sizing: border-box;
        border: 3px solid transparent;
        border-color: transparent transparent var(--lumo-base-color) var(--lumo-base-color);
        transform-origin: 0 0;
        transform: rotate(-45deg);
        box-shadow: -2px 2px 2px 0 var(--lumo-shade-20pct);
      }

      :host([labels]) [part~='label'] {
        display: flex;
      }
    `;
  }

  render() {
    return html`
      <div id="container" part="container">
        <div id="line" part="line">
          <div id="line-color" part="line-color"></div>
          <div id="knobs" part="knobs"></div>
        </div>
      </div>
    `;
  }

  updated(props: PropertyValues) {
    const { ranges, step } = this;

    if (props.has('labels') && this.labels) {
      this.knobIndexes.forEach(i => this.setLabelPosition(i, this.values));
    }

    if (props.has('ranges')) {
      if (typeof ranges === 'number' && ranges >= 0) this.knobs = 2 * ranges || 1;
      else this.ranges = 0;
    }

    if (props.has('ranges') || props.has('min') || props.has('max')) {
      this.setKnobElements();
      this.setValue((this.value = this.initialValue));
    }

    if (props.has('step')) {
      if (!Number.isSafeInteger(step)) this.step = Math.round(step);
      if (step < 1) this.step = 1;
    }

    if (props.has('value')) {
      this.setValue();
    }
  }

  /** @private */
  passive = true;

  /** @private */
  handleEvent(e: Event) {
    switch (e.type) {
      case 'mousedown':
      case 'touchstart':
        if (!Slider.isValid(e) || this.isKnobClick(e)) return;
        this.knob?.focus();
        this.startDrag(e);
        this.dragging = true;
        break;
      case 'mousemove':
      case 'touchmove':
        this.drag(e);
        break;
      case 'mouseup':
      case 'touchend':
        this.dragging = false;
        break;
      case 'keydown':
        this.keyMove(e, this.knobIndex);
        break;
    }
  }

  private static hasTouched = false;

  /**
   * Check if an event was triggered by touch.
   */
  private static isTouch(e: Event): e is TouchEvent {
    return 'touches' in e;
  }

  /**
   * Prevent mobile browsers from handling mouse events (conflicting with touch ones).
   * If we detected a touch interaction before, we prefer reacting to touch events only.
   */
  private static isValid(event: Event) {
    const { hasTouched, isTouch } = Slider;
    if (hasTouched && !isTouch(event)) return false;
    if (!hasTouched) Slider.hasTouched = isTouch(event);
    return true;
  }

  private get valueChangedEvent() {
    const detail = {
      index: this.knobIndex,
      value: this.values[this.knobIndex],
      values: this.values,
    };
    const event = new CustomEvent(CustomEvents.valueChanged, { detail });
    return event as ValueChangedEvent;
  }

  private static getKnobIndex(knob: HTMLElement) {
    const idMatch = /knob-(.)/.exec(knob.getAttribute('part') || '');
    return idMatch ? Number(idMatch[1]) : 0;
  }

  private get knobIndex() {
    return this.knob ? Slider.getKnobIndex(this.knob) : 0;
  }

  private isKnobClick(e: Event) {
    return !Slider.hasTouched && (e as MouseEvent).button !== 0;
  }

  private setLabelValues(values = this.values) {
    const { knobIndexes } = this;
    knobIndexes.forEach(i => {
      const labelElement = this.labelElement(i) as HTMLElement;
      const labelElementValue = labelElement.firstElementChild as HTMLSpanElement;
      if (labelElement) labelElementValue.innerText = `${values[i]}`;
    });
  }

  private setAriaValues(i = 0, values = this.values) {
    const { knobs, min, max } = this;
    const knob = this.knobElement(i) as HTMLElement;
    if (knob) {
      knob.setAttribute('aria-valuenow', `${values[i]}`);
      knob.setAttribute('aria-valuemin', `${knobs === 1 ? min : this.getPrevNeighborValue(i)}`);
      knob.setAttribute('aria-valuemax', `${knobs === 1 ? max : this.getNextNeighborValue(i)}`);
    }
  }

  private get initialValue() {
    const { knobs, min, max, step } = this;
    const valueAttr = this.getAttribute('value');
    const valueStep = (max - min) / (knobs - 1);
    const values: number[] = [];
    this.knobIndexes.forEach(i => {
      let init = Math.round(i === 0 ? min : i < knobs - 1 ? i * valueStep : max);
      init -= init % step;
      values.push(init < min ? min : init > max ? max : init);
    });
    if (valueAttr && !this.ranges) values[0] = Number(valueAttr);
    return values;
  }

  private get values() {
    let { value } = this;
    if (typeof value === 'string') value = JSON.parse(value[0] === '[' ? value : `[${value}]`);
    else value = (Array.isArray(value) ? value : [value || 0]) as number[];
    return value as number[];
  }

  private setValue(values = this.values) {
    this.setLabelValues(values);
    this.knobIndexes.forEach(i => {
      this.setAriaValues(i, values);
      this.setLabelPosition(i, values);
      this.setKnobPostion(i, values);
      this.setLineColors(values);
    });
    this.dispatchEvent(this.valueChangedEvent);
  }

  private setKnobPostion(i = 0, values = this.initialValue) {
    const { min, max } = this;
    const lineWidth = this.lineBounds!.width;
    const knob = this.knobElement(i) as HTMLElement;
    if (knob) {
      const knobWidth = this.getBounds(knob).width;
      const position = ((values[i] - min) / (max - min)) * lineWidth - knobWidth / 2;
      knob.style.left = `${position}px`;
    }
  }

  private setLabelPosition(i = 0, values = this.values) {
    const { min, max } = this;
    const lineWidth = this.lineBounds!.width;
    const label = this.labelElement(i) as HTMLElement;
    if (label) {
      const labelWidth = this.getBounds(label).width;
      const position = ((values[i] - min) / (max - min)) * lineWidth - labelWidth / 2;
      label.style.left = `${position}px`;
    }
  }

  private setLineColors(values = this.values) {
    const { knobs, min, max } = this;
    const length = max - min;
    const lineColor = getComputedStyle(this).getPropertyValue('--vcf-slider-line-color').trim();
    const altLineColor = getComputedStyle(this).getPropertyValue('--vcf-slider-line-alt-color').trim();
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

  private set dragging(state: boolean) {
    const toggleEvent = state ? document.addEventListener : document.removeEventListener;
    toggleEvent(Slider.hasTouched ? 'touchmove' : 'mousemove', this);
    toggleEvent(Slider.hasTouched ? 'touchend' : 'mouseup', this);
  }

  private getPointerX(e: Event) {
    let pointerX: number | null = null;
    if (e instanceof MouseEvent) pointerX = (e as MouseEvent).pageX;
    else if (e instanceof TouchEvent) pointerX = (e as TouchEvent).touches[0].pageX;
    return pointerX;
  }

  private startDrag = (e: Event) => {
    const { knobsContainer } = this;
    this.knob = e.target as HTMLElement;
    this.originalPointerX = this.getPointerX(e);
    this.originalKnobOffsetX = this.getBounds(this.knob).x - this.lineBounds!.x;

    // Move current knob and label to top
    knobsContainer?.appendChild(this.knob);
    knobsContainer?.appendChild(this.label);
  };

  private drag = (e: Event) => {
    const { knobIndex: i, knob, knobs, originalKnobOffsetX, originalPointerX, line, lineBounds } = this;
    if (knob && line) {
      const knobBounds = this.getBounds(knob);
      let startX = -knobBounds.width / 2;
      let endX = lineBounds!.width - knobBounds.width / 2;
      const part = `knob-${i}`;

      // Set knob limits
      switch (part) {
        case 'knob-0': {
          if (knobs > 1) {
            const toKnob = line.querySelector('[part~="knob-1"]') as HTMLElement;
            endX = this.getBounds(toKnob).x - lineBounds!.x;
          }
          break;
        }
        case `knob-${knobs - 1}`: {
          if (knobs > 1) {
            const fromKnob = line.querySelector(`[part~="knob-${knobs - 2}"]`) as HTMLElement;
            startX = this.getBounds(fromKnob).x - lineBounds!.x;
          }
          break;
        }
        default: {
          const fromKnob = line.querySelector(`[part~="knob-${i - 1}"]`) as HTMLElement;
          const toKnob = line.querySelector(`[part~="knob-${i + 1}"]`) as HTMLElement;
          startX = this.getBounds(fromKnob).x - lineBounds!.x;
          endX = this.getBounds(toKnob).x - lineBounds!.x;
        }
      }

      // Calculate knob position
      const pageX = this.getPointerX(e);
      if (pageX && originalPointerX) {
        let newPositionX = originalKnobOffsetX + (pageX - originalPointerX);
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
    }
  };

  private get label() {
    return this.labelElement(this.knobIndex) as HTMLElement;
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
    const { knobIndexes, knobsContainer } = this;
    if (knobsContainer) {
      knobsContainer.innerHTML = '';
      knobIndexes.map(i => {
        knobsContainer.appendChild(this.createKnobElement(i));
        knobsContainer.appendChild(this.createKnobLabelElement(i));
      });
    }
  }

  private createKnobElement(knobIndex: number) {
    const isAltKnob = knobIndex % 2 ? 'alt-knob' : '';
    return this.createElement(
      html`
        <div
          role="slider"
          part="knob ${isAltKnob} knob-${knobIndex}"
          tabindex="${knobIndex + 1}"
          @mousedown="${this}"
          @touchstart="${this}"
          @keydown="${this}"
        ></div>
      `
    );
  }

  private createKnobLabelElement(knobIndex: number) {
    return this.createElement(
      html`
        <div part="label label-${knobIndex}">
          <span part="label-value label-value-${knobIndex}"></span>
          <div part="label-triangle label-triangle-${knobIndex}"></div>
        </div>
      `
    );
  }

  private getPrevNeighborValue(knobIndex: number) {
    const { values, step, min } = this;
    let neighboringValue;
    neighboringValue = values[knobIndex - 1];
    const neighborPrecisionOffset = neighboringValue % step;
    if (neighborPrecisionOffset) neighboringValue += step - neighborPrecisionOffset;
    return neighboringValue || min;
  }

  private getNextNeighborValue(knobIndex: number) {
    const { values, step, max } = this;
    let neighboringValue;
    neighboringValue = values[knobIndex + 1];
    const neighborPrecisionOffset = neighboringValue % step;
    if (neighborPrecisionOffset) neighboringValue -= neighborPrecisionOffset;
    return neighboringValue || max;
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
      other: Math.max(min, values[knobIndex] - step, this.getPrevNeighborValue(knobIndex)),
    });
  }

  private decreaseKnobValueToLowest(knobIndex: number) {
    const { min } = this;
    this.decreaseKnobValue({
      knobIndex,
      single: min,
      first: min,
      // Use the biggest number between min value and the neighboring value.
      other: Math.max(min, this.getPrevNeighborValue(knobIndex)),
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
      other: Math.min(max, values[knobIndex] + step, this.getNextNeighborValue(knobIndex)),
    });
  }

  private increaseKnobValueToHighest(knobIndex: number) {
    const { max } = this;
    this.increaseKnobValue({
      knobIndex,
      single: max,
      last: max,
      // Use the smallest number between max value and the neighboring value.
      other: Math.min(this.max, this.getNextNeighborValue(knobIndex)),
    });
  }

  private keyMove(event: Event, knobIndex: number) {
    let flag = false;
    const key = (event as KeyboardEvent).key || (event as KeyboardEvent).keyCode;
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

  private createElement(template: TemplateResult) {
    return (render(template, document.createElement('x')).parentNode as HTMLElement).firstElementChild as HTMLElement;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vcf-slider': Slider;
  }
}

interface KnobValueOptions {
  knobIndex: number;
  single: number;
  first?: number;
  last?: number;
  other: number;
}
