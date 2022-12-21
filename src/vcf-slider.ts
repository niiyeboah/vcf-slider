import { html, css, PropertyValues, LitElement, render, TemplateResult } from 'lit';
import { query, property, customElement } from 'lit/decorators.js';
import { CustomEventMixin, CustomEvents, ValueChangedEvent } from './mixins/CustomEventMixin';
import { ThemableMixin } from '@vaadin/vaadin-themable-mixin';

/**
 * `<vcf-slider>` Slider web component for the Vaadin platform.
 *
 * @csspart container - Wrapper element.
 * @csspart line - Line element.
 * @csspart knob - Knob elements.
 * @csspart knob-n - Nth knob element.
 * @csspart tooltip - Knob tooltip containers.
 * @csspart tooltip-n - Nth knob tooltip container.
 * @csspart tooltip-value - Knob tooltip value elements.
 * @csspart tooltip-value-n - Nth knob tooltip value element.
 * @csspart tooltip-triangle - Knob tooltip triangle elements.
 * @csspart tooltip-triangle-n - Nth knob tooltip triangle element.
 *
 * @cssprop [--vcf-slider-knob-alt-color=var(--lumo-error-color)] - Color of `::part(alt-knob)`.
 * @cssprop [--vcf-slider-knob-color=var(--lumo-primary-color)] - Color of `::part(knob)`.
 * @cssprop [--vcf-slider-knob-size=var(--lumo-space-m)] - Size (width, height) of `::part(knob)`.
 * @cssprop [--vcf-slider-tooltip-font-size=var(--lumo-font-size-s)] - Font size of `::part(tooltip)`.
 * @cssprop [--vcf-slider-line-alt-color=var(--lumo-contrast-30pct)] - Secondary background color of `::part(line)`.
 * @cssprop [--vcf-slider-line-color=var(--lumo-contrast-50pct)] - Background color of `::part(line)`.
 * @cssprop [--vcf-slider-line-height=var(--lumo-space-s)] - Width of `::part(line)`.
 * @cssprop [--vcf-slider-padding=var(--lumo-space-xs)] - Padding of `::part(container)`.
 * @cssprop [--vcf-slider-width=100%] - Width of `:host`.
 *
 * @event {ValueChangedEvent} value-changed - Fired when the slider value changes. Returns a single knob value and index.
 */
@customElement('vcf-slider')
export class Slider extends CustomEventMixin(ThemableMixin(LitElement)) {
  /** If `true`, show tooltips that display values above slider knobs. */
  @property({ type: Boolean, reflect: true }) tooltips = false;

  /** If `true`, change *orientation* of the range slider from horizontal to vertical. */
  @property({ type: Boolean, reflect: true }) vertical = false;

  /** If `true`, reverse *direction* so that low to high values go from right to left. */
  @property({ type: Boolean }) rtl = false;

  /** Current value(s) of the slider. */
  @property({ type: Number }) value: string | number | number[] = 0;

  /** Number of ranges (knobs) to display on the slider. */
  @property({ type: Number }) ranges = 0;

  /** Specifies the granularity that the value must adhere to. */
  @property({ type: Number }) step = 1;

  /** Maximum value. */
  @property({ type: Number }) min = 0;

  /** Minimum value. */
  @property({ type: Number }) max = 50;

  @query('#knobs') private knobsContainer?: HTMLElement;
  @query('#line') private line?: HTMLElement;
  @query('#line-color') private lineColorElement?: HTMLElement;

  protected static is() {
    return 'vcf-slider';
  }

  protected static get version() {
    return '1.0.8';
  }

  private knob?: HTMLElement;
  private originalKnobOffsetXY = 0;
  private originalPointerXY: number | null = 0;
  private knobCount = 1;
  private decimalCount = 0;

  private get xy() {
    return this.vertical ? 'y' : 'x';
  }

  private get pageXY() {
    return this.vertical ? 'pageY' : 'pageX';
  }

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
        --vcf-slider-knob-alt-color: var(--lumo-error-color);
        --vcf-slider-knob-color: var(--lumo-primary-color);
        --vcf-slider-knob-size: var(--lumo-space-m);
        --vcf-slider-tooltip-font-size: var(--lumo-font-size-s);
        --vcf-slider-line-alt-color: var(--lumo-contrast-30pct);
        --vcf-slider-line-color: var(--lumo-contrast-50pct);
        --vcf-slider-line-height: var(--lumo-space-s);
        --vcf-slider-padding: var(--lumo-space-xs);
        --vcf-slider-width: 100%;
        --vcf-slider-vertical-height: 200px;
        /* PRIVATE */
        --l-height: var(--vcf-slider-line-height);
        --k-size: calc(var(--vcf-slider-knob-size) * 2);
      }

      :host * {
        box-sizing: border-box;
      }

      :host([tooltips]) {
        padding-top: calc(var(--vcf-slider-tooltip-font-size) + 4px + var(--lumo-space-s));
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

      /* KNOBS */

      [part~='knob'] {
        position: absolute;
        display: flex;
        right: 'unset';
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

      /* TOOLTIPS */

      [part~='tooltip'] {
        display: none;
        flex-flow: column;
        align-items: center;
        position: absolute;
        bottom: calc(var(--k-size) * 0.5 + var(--lumo-space-xs));
        border-radius: 2px;
        box-shadow: var(--lumo-box-shadow-xs);
        background-color: var(--lumo-base-color);
        padding: 2px var(--lumo-space-s);
        font-size: var(--vcf-slider-tooltip-font-size);
        pointer-events: none;
        user-select: none;
      }

      [part~='tooltip-triangle'] {
        position: relative;
        margin: 0;
        box-sizing: border-box;
        background: var(--lumo-base-color);
      }

      [part~='tooltip-triangle']::after {
        content: '';
        position: absolute;
        left: -4px;
        width: 0;
        height: 0;
        box-sizing: border-box;
        border: 3px solid transparent;
        border-color: transparent transparent var(--lumo-base-color) var(--lumo-base-color);
        transform-origin: 2px 1px;
        transform: rotate(-45deg);
        box-shadow: -2px 2px 2px 0 var(--lumo-shade-20pct);
      }

      :host([tooltips]) [part~='tooltip'] {
        display: flex;
      }

      /* VERTICAL */

      :host([tooltips][vertical]) {
        padding-top: 0px;
        padding-right: calc(var(--vcf-slider-tooltips-width) + 4px + var(--lumo-space-xs));
      }

      :host([vertical]) {
        display: inline-flex;
        width: max-content;
        margin: var(--lumo-space-s);
        height: var(--vcf-slider-vertical-height);
      }

      :host([vertical]) #line {
        width: var(--l-height);
        height: 100%;
      }

      :host([vertical]) [part~='knob'] {
        bottom: unset;
        left: calc(-0.5 * var(--k-size) + calc(0.5 * var(--l-height)));
      }

      :host([vertical]) [part~='tooltip'] {
        flex-flow: row;
        left: calc(var(--k-size) * 0.5 + var(--lumo-space-s));
        bottom: unset;
        align-items: center;
        border-radius: var(--lumo-border-radius-s);
      }

      :host([vertical]) [part~='tooltip-triangle']::after {
        content: unset;
      }

      :host([vertical]) [part~='tooltip']::after {
        content: '';
        position: absolute;
        left: 1px;
        width: 0px;
        height: 0px;
        box-sizing: border-box;
        border: 7px solid transparent;
        border-color: transparent transparent var(--lumo-base-color) var(--lumo-base-color);
        transform-origin: 4px -1px;
        transform: rotate(45deg);
        box-shadow: -2px 2px 2px 0 var(--lumo-shade-10pct);
        border-radius: 2px;
      }

      /* RTL */

      :host([rtl]:not([vertical])) [part~='knob'] {
        left: unset;
      }

      :host([vertical][rtl]) [part~='knob'] {
        top: unset;
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

  protected firstUpdated() {}

  protected updated(props: PropertyValues) {
    const { ranges, step } = this;

    if (props.has('step')) {
      this.step = this.step < 0 ? 1 : this.step;
      this.decimalCount = this.getDecimalCount(step);
    }

    if (props.has('tooltips') && this.tooltips) {
      this.knobIndexes.forEach(i => this.setTooltipPosition(i, this.values));
    }

    if (props.has('ranges')) {
      if (typeof ranges === 'number' && ranges >= 0) this.knobs = 2 * ranges || 1;
      else this.ranges = 0;
    }

    if (props.has('rtl') || props.has('ranges') || props.has('min') || props.has('max')) {
      this.setKnobElements();
      this.setValue((this.value = this.initialValue));
    }

    if (props.has('value') || props.has('vertical')) {
      if (!this.isSorted()) this.sort();
      else this.setValue();
    }
  }

  /** @private */
  passive = 'true';

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

  private setTooltipValues(values = this.values) {
    const { knobIndexes } = this;
    knobIndexes.forEach(i => {
      const tooltipElement = this.tooltipElement(i) as HTMLElement;
      const tooltipElementValue = tooltipElement.firstElementChild as HTMLSpanElement;
      if (tooltipElement) tooltipElementValue.innerText = `${values[i].toFixed(this.decimalCount)}`;
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
    values = values.sort((a, b) => a - b);
    this.setTooltipValues(values);
    this.knobIndexes.forEach(i => {
      this.setAriaValues(i, values);
      this.setTooltipPosition(i, values);
      this.setKnobPostion(i, values);
      this.setLineColors(values);
    });
    this.dispatchEvent(this.valueChangedEvent);
  }

  private setKnobPostion(i = 0, values = this.initialValue) {
    const { min, max, lineBounds } = this;
    const knob = this.knobElement(i) as HTMLElement;
    if (knob) {
      const knobBounds = this.getBounds(knob);
      const knobSize = this.vertical ? knobBounds.height : knobBounds.width;
      const lineSize = this.vertical ? lineBounds.height : lineBounds.width;
      const position = ((values[i] - min) / (max - min)) * lineSize - knobSize / 2;
      if (this.vertical) {
        knob.style[this.rtl ? 'bottom' : 'top'] = `${position}px`;
        knob.style.removeProperty('right');
        knob.style.removeProperty('left');
      } else {
        knob.style[this.rtl ? 'right' : 'left'] = `${position}px`;
        knob.style.removeProperty('bottom');
        knob.style.removeProperty('top');
      }
    }
  }

  private setTooltipPosition(i = 0, values = this.values) {
    const { min, max, lineBounds } = this;
    const tooltip = this.tooltipElement(i) as HTMLElement;
    if (tooltip) {
      const tooltipBounds = this.getBounds(tooltip);
      const tooltipSize = this.vertical ? tooltipBounds.height : tooltipBounds.width;
      const lineSize = this.vertical ? lineBounds.height : lineBounds.width;
      const position = ((values[i] - min) / (max - min)) * lineSize - tooltipSize / 2;
      if (this.vertical) {
        tooltip.style[this.rtl ? 'bottom' : 'top'] = `${position}px`;
        tooltip.style.removeProperty('right');
        tooltip.style.removeProperty('left');
      } else {
        tooltip.style[this.rtl ? 'right' : 'left'] = `${position}px`;
        tooltip.style.removeProperty('bottom');
        tooltip.style.removeProperty('top');
      }
      this.style.setProperty('--vcf-slider-tooltip-width', `${tooltipBounds.width}px`);
    }
  }

  private setLineColors(values = this.values) {
    const { knobs, min, max, lineColorElement, vertical, rtl } = this;
    const length = max - min;
    const lineColor = getComputedStyle(this).getPropertyValue('--vcf-slider-line-color').trim();
    const altLineColor = getComputedStyle(this).getPropertyValue('--vcf-slider-line-alt-color').trim();
    const direction = vertical ? (rtl ? 'top' : 'bottom') : rtl ? 'left' : 'right';
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
    if (lineColorElement) lineColorElement.style.background = `linear-gradient(to ${direction}, ${colors})`;
  }

  private set dragging(state: boolean) {
    const toggleEvent = state ? document.addEventListener : document.removeEventListener;
    toggleEvent(Slider.hasTouched ? 'touchmove' : 'mousemove', this);
    toggleEvent(Slider.hasTouched ? 'touchend' : 'mouseup', this);
  }

  private getPointerXY(e: Event) {
    let pointerPos: number | null = null;
    if (e instanceof MouseEvent) pointerPos = (e as MouseEvent)[this.pageXY];
    else if (e instanceof TouchEvent) pointerPos = (e as TouchEvent).touches[0][this.pageXY];
    return pointerPos;
  }

  private startDrag = (e: Event) => {
    const { knobsContainer, xy } = this;
    this.knob = e.target as HTMLElement;
    this.originalPointerXY = this.getPointerXY(e);
    this.originalKnobOffsetXY = this.getBounds(this.knob)[xy] - this.lineBounds[xy];

    // Move current knob and tooltip to top
    knobsContainer?.appendChild(this.knob);
    knobsContainer?.appendChild(this.tooltip);
  };

  private drag = (e: Event) => {
    const {
      knobIndex: i,
      vertical,
      rtl,
      knob,
      knobs,
      originalKnobOffsetXY,
      originalPointerXY,
      xy,
      line,
      lineBounds,
    } = this;

    if (knob && line) {
      const knobBounds = this.getBounds(knob);
      const knobSize = vertical ? knobBounds.height : knobBounds.width;
      const lineSize = vertical ? lineBounds.height : lineBounds.width;
      const lineStart = -knobSize / 2;
      const lineEnd = lineSize - knobSize / 2;
      const part = `knob-${i}`;
      let start = rtl ? lineEnd : lineStart;
      let end = rtl ? lineStart : lineEnd;

      // Set knob limits
      switch (part) {
        case 'knob-0': {
          if (knobs > 1) {
            const toKnob = line.querySelector('[part~="knob-1"]') as HTMLElement;
            end = this.getBounds(toKnob)[xy] - lineBounds[xy];
          }
          break;
        }
        case `knob-${knobs - 1}`: {
          if (knobs > 1) {
            const fromKnob = line.querySelector(`[part~="knob-${knobs - 2}"]`) as HTMLElement;
            start = this.getBounds(fromKnob)[xy] - lineBounds[xy];
          }
          break;
        }
        default: {
          const fromKnob = line.querySelector(`[part~="knob-${i - 1}"]`) as HTMLElement;
          const toKnob = line.querySelector(`[part~="knob-${i + 1}"]`) as HTMLElement;
          start = this.getBounds(fromKnob)[xy] - lineBounds[xy];
          end = this.getBounds(toKnob)[xy] - lineBounds[xy];
        }
      }

      // Calculate knob position
      requestAnimationFrame(() => {
        const pointerXY = this.getPointerXY(e);
        if (pointerXY && originalPointerXY) {
          let newKnobPositionXY = originalKnobOffsetXY + (pointerXY - originalPointerXY);
          let startLimit = rtl ? newKnobPositionXY >= start : newKnobPositionXY <= start;
          let endLimit = rtl ? newKnobPositionXY <= end : newKnobPositionXY >= end;
          newKnobPositionXY = startLimit ? start : endLimit ? end : newKnobPositionXY;

          // Calculate new value
          let multiplier = 0;
          let { min, max, step, values } = this;
          let length = max - min;
          const pct = (newKnobPositionXY + knobSize / 2) / lineSize;
          let value = pct * length;

          // RTL
          if (rtl) value = length - value;

          // Multiplier
          if (this.decimalCount) {
            // Round to same number of decimal places as step
            value = this.round(value);
            // To avoid problems with decimal math, multiply to operate with integers
            multiplier = Math.max(this.getMultiplier(value), this.getMultiplier(step), this.getMultiplier(min));
            value = Math.round(value * multiplier);
            step *= multiplier;
            min *= multiplier;
            length *= multiplier;
          } else {
            value = Math.round(value);
          }

          // Step
          if (value >= length) {
            // Limit to max value
            value = length;
          } else if (!(value === min || (value > min && Math.abs(value) % step === 0))) {
            // Round to step
            value = Math.round(value / step) * step;
          }

          // Adjust value relative to min after step calculations
          value += min;

          // Remove multiplier
          if (this.decimalCount) value /= multiplier;

          // Set new value
          if (values[i] !== value) {
            values[i] = value;
            this.value = this.knobs === 1 ? value : [...values];
          }
        }
      });
    }
  };

  private round(value: number) {
    return parseFloat(value.toFixed(this.decimalCount));
  }

  private getMultiplier(value: number) {
    let result = 0;
    if (!isNaN(value)) result = 10 ** this.getDecimalCount(value);
    return result;
  }

  private getDecimalCount(value: number) {
    const s = String(value);
    const i = s.indexOf('.');
    return i === -1 ? 0 : s.length - i - 1;
  }

  private get tooltip() {
    return this.tooltipElement(this.knobIndex) as HTMLElement;
  }

  private tooltipElement(i = 0) {
    return this.shadowRoot?.querySelector(`[part~=tooltip-${i}]`) as HTMLElement;
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
        knobsContainer.appendChild(this.createKnobTooltipElement(i));
      });
    }
  }

  private createKnobElement(knobIndex: number) {
    const isAltKnob = knobIndex % 2 ? 'alt-knob' : '';
    const handleEvent = this as { handleEvent: EventListener };
    return this.createElement(
      html`
        <div
          role="slider"
          part="knob ${isAltKnob} knob-${knobIndex}"
          tabindex="${knobIndex + 1}"
          @mousedown="${handleEvent}"
          @touchstart="${handleEvent}"
          @keydown="${handleEvent}"
        ></div>
      `
    );
  }

  private createKnobTooltipElement(knobIndex: number) {
    return this.createElement(
      html`
        <div part="tooltip tooltip-${knobIndex}">
          <span part="tooltip-value tooltip-value-${knobIndex}"></span>
          <div part="tooltip-triangle tooltip-triangle-${knobIndex}"></div>
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
    return this.getBounds(this.line as HTMLElement);
  }

  private createElement(template: TemplateResult) {
    return (render(template, document.createElement('x')).parentNode as HTMLElement).firstElementChild as HTMLElement;
  }

  private sort() {
    this.value = this.values.sort((a, b) => a - b);
  }

  private isSorted(values = this.values) {
    return values.every((_, i, a) => !a[i - 1] || a[i] >= a[i - 1]);
  }
}

export { ValueChangedEvent };

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
