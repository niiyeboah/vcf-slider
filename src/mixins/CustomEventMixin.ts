export type Constructor<T = HTMLElement> = new (...args: any[]) => T;

export type ValueChangedEvent = CustomEvent<{ index: number; value: number; values: number[] }>;

export enum CustomEvents {
  valueChanged = 'value-changed',
}

export interface SliderCustomEventMap {
  [CustomEvents.valueChanged]: ValueChangedEvent;
}

export interface SliderEventMap extends HTMLElementEventMap, SliderCustomEventMap {}

export function CustomEventMixin<TElement extends Constructor>(BaseElement: TElement) {
  return class CustomEventTarget extends BaseElement {
    addEventListener<K extends keyof SliderEventMap>(
      type: K,
      listener: (this: CustomEventTarget, e: SliderEventMap[K]) => void,
      options?: AddEventListenerOptions | boolean
    ): void;

    /** @private */
    addEventListener(
      type: string,
      listener: (this: CustomEventTarget, e: Event) => void,
      options?: boolean | AddEventListenerOptions
    ) {
      super.addEventListener(type, listener, options);
    }

    removeEventListener<K extends keyof SliderEventMap>(
      type: K,
      listener: (this: CustomEventTarget, e: SliderEventMap[K]) => void,
      options?: EventListenerOptions | boolean
    ): void;

    /** @private */
    removeEventListener(
      type: string,
      listener: (this: CustomEventTarget, e: Event) => void,
      options?: boolean | AddEventListenerOptions
    ) {
      super.removeEventListener(type, listener, options);
    }
  };
}
