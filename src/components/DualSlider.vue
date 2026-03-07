<script setup>
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
const {t} = useI18n()
const props = defineProps({
  min: { type: Number, default: 0 },
  max: { type: Number, default: 10000000 },
  step: { type: Number, default: 10000 },
  minValue: { type: Number, default: 2500000 },
  maxValue: { type: Number, default: 7500000 },
});

const emit = defineEmits(["update:minValue", "update:maxValue"]);

const localMinVal = ref(props.minValue);
const localMaxVal = ref(props.maxValue);
watch(localMinVal, (val) => emit("update:minValue", val));
watch(localMaxVal, (val) => emit("update:maxValue", val));

watch(() => props.minValue, (newVal) => {
  localMinVal.value = newVal;
});

watch(() => props.maxValue, (newVal) => {
  localMaxVal.value = newVal;
});

const handleMinInput = (e) => {
  const value = parseInt(e.target.value);
  if (value + props.step > localMaxVal.value) {
    localMinVal.value = localMaxVal.value - props.step;
  } else {
    localMinVal.value = value;
  }
  emit("update:minValue", localMinVal.value);
};

const handleMaxInput = (e) => {
  const value = parseInt(e.target.value);
  if (value - props.step < localMinVal.value) {
    localMaxVal.value = localMinVal.value + props.step;
  } else {
    localMaxVal.value = value;
  }
  emit("update:maxValue", localMaxVal.value);
};

const rangeStyle = computed(() => {
  const range = props.max - props.min;
  if (range === 0) return { left: '0%', width: '0%' };

  const leftPercent = ((localMinVal.value - props.min) / range) * 100;
  const widthPercent = ((localMaxVal.value - localMinVal.value) / range) * 100;

  return {
    left: `${leftPercent}%`,
    width: `${widthPercent}%`,
  };
});
</script>

<template>
  <div class="w-full bg-white rounded-2xl">
    <div class="relative w-full h-10 flex items-center">
      <div class="absolute w-full h-1.5 bg-gray-200 rounded-full"></div>

      <div
        class="absolute h-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full transition-all duration-300"
        :style="rangeStyle"
      ></div>

      <input
        type="range"
        :min="min"
        :max="max"
        :step="step"
        :value="localMinVal"
        @input="handleMinInput"
        class="absolute w-full appearance-none bg-transparent pointer-events-none h-1.5 dual-range-slider"
      />
      <input
        type="range"
        :min="min"
        :max="max"
        :step="step"
        :value="localMaxVal"
        @input="handleMaxInput"
        class="absolute w-full appearance-none bg-transparent pointer-events-none h-1.5 dual-range-slider"
      />
    </div>

    <div class="flex justify-between mt-6 max-md:mt-0">
       <div class="">
          <label class="text-sm font-medium text-gray-500">{{ t('min') }}</label>
          <div class="mt-1 text-[16px] font-semibold text-gray-800">{{ localMinVal.toLocaleString() }} UZS</div>
       </div>
       <div class="">
          <label class="text-sm font-medium text-gray-500">{{ t('max') }}</label>
          <div class="mt-1 text-[16px] w-full font-semibold text-gray-800">{{ localMaxVal.toLocaleString() }} UZS</div>
       </div>
    </div>
  </div>
</template>

<style>
.dual-range-slider,
.dual-range-slider::-webkit-slider-runnable-track,
.dual-range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
}

.dual-range-slider {
  pointer-events: none;
  width: 100%;
}

.dual-range-slider::-webkit-slider-thumb {
  height: 22px;
  width: 22px;
  border-radius: 50%;
  background-color: white;
  border: 4px solid #2563eb; /* blue-600 */
  box-shadow: 0 0 0 2px white, 0 2px 5px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  pointer-events: auto;
  margin-top: -9.5px;
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.dual-range-slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
  box-shadow: 0 0 0 4px white, 0 4px 10px rgba(0, 0, 0, 0.25);
}

.dual-range-slider:focus::-webkit-slider-thumb {
  transform: scale(1.15);
  box-shadow: 0 0 0 4px white, 0 0 0 6px rgba(37, 99, 235, 0.45);
}

.dual-range-slider::-moz-range-thumb {
  height: 22px;
  width: 22px;
  border-radius: 50%;
  background-color: white;
  border: 4px solid #2563eb; /* blue-600 */
  box-shadow: 0 0 0 2px white, 0 2px 5px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  pointer-events: auto;
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.dual-range-slider::-moz-range-thumb:hover {
  transform: scale(1.15);
  box-shadow: 0 0 0 4px white, 0 4px 10px rgba(0, 0, 0, 0.25);
}

.dual-range-slider:focus::-moz-range-thumb {
  transform: scale(1.15);
  box-shadow: 0 0 0 4px white, 0 0 0 6px rgba(37, 99, 235, 0.45);
}
</style>
