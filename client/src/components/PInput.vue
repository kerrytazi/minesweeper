<script setup lang="ts">
import { ref } from 'vue';

const props = withDefaults(defineProps<{
	value?: string;
	placeholder: string;
	inputMask?: RegExp;
	width?: string;
	height?: string;
}>(), {
	value: '',
	width: '320px',
	height: '50px',
});

const emit = defineEmits<{
	input: [e: Event];
}>();

const focused = ref(false);

const beforeinput = (e: Event) => {
	const newText = (<InputEvent>e).data;

	if (newText && props.inputMask && !props.inputMask.test(newText)) {
		e.preventDefault();
	}
};

const input = (e: Event) => {
	emit('input', e);
};
</script>

<template>
	<div class="wrapper">
		<fieldset>
			<legend class="placeholder-back" :class="{ nonempty: focused || value.length > 0 }" v-text="placeholder"></legend>
			<div class="placeholder" :class="{ nonempty: focused || value.length > 0 }" v-text="placeholder"></div>
			<input
			type="text"
			@beforeinput="beforeinput"
			:value="value"
			@input="input"
			@focus="focused = true"
			@blur="focused = false"/>
		</fieldset>
	</div>
</template>

<style scoped>
.wrapper {
	--pinput-width: v-bind('width');
	--pinput-height: v-bind('height');
	--pinput-margin: calc(var(--pinput-height) / 16);
	--legend-border-size: 2px;
	--input-text-margin: calc(var(--pinput-height) / 8);

	width: var(--pinput-width);
	height: var(--pinput-height);
}
fieldset {
	position: absolute;
	margin: var(--pinput-margin);
	border-color: rgb(0,0,0);
	border-width: var(--legend-border-size);
}
.placeholder-back {
	font-size: 0;
	padding: 0;
	color: rgba(0, 0, 0, 0);
	margin-left: calc(var(--pinput-height) / 8);
	height: 0;
	transition: all 0.2s;

	-webkit-user-select: none;
	-ms-user-select: none;
	user-select: none;
}
.placeholder-back.nonempty {
	font-size: calc(var(--pinput-height) / 4);
	padding-left: calc(var(--pinput-height) / 8);
	padding-right: calc(var(--pinput-height) / 8);
}
.placeholder {
	position: absolute;
	color: gray;
	font-size: calc(var(--pinput-height) / 2);
	transition: all 0.2s;
	pointer-events: none;
	margin: var(--input-text-margin);
}
.placeholder.nonempty {
	font-size: calc(var(--pinput-height) / 4);
	margin-top: calc(var(--pinput-height) / -6);
	margin-left: calc(var(--input-text-margin) + var(--pinput-height) / 8);
}
input {
	font-size: calc(var(--pinput-height) / 2);
	margin: var(--input-text-margin);
	width: calc(var(--pinput-width) - var(--input-text-margin) * 2 - var(--legend-border-size) * 2 - var(--pinput-margin) * 2);
	height: calc(var(--pinput-height) - var(--input-text-margin) * 2 - var(--legend-border-size) * 2 - var(--pinput-margin) * 2);
}
</style>
