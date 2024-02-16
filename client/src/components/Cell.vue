<script setup lang="ts">

const props = defineProps<{
	nMinesAround: number;
	isMine: boolean;
	isFlag: boolean;
	isOpen: boolean;
	isWrongFlag: boolean;
	isHighlightClick: boolean;
	isHighlightFlag: boolean;
}>();
</script>

<template>
	<div
		class="cell"
		:class="[
			isMine ? 'cell-mine' : '',
			isFlag ? 'cell-flag' : '',
			isOpen ? 'cell-open' : '',
			isOpen && !isMine && nMinesAround > 0 ? `cell-n${nMinesAround}` : '',
			isWrongFlag ? 'cell-wrong-flag' : '',
			isHighlightClick ? 'cell-highlight-click' : '',
			isHighlightFlag ? 'cell-highlight-flag' : '',
		]"></div>
</template>

<style scoped>
@font-face {
	font-family: "Chakra Petch";
	src: url("ChakraPetch-Bold.ttf");
	font-weight: bold;
}
.cell {
	background-color: var(--cell-color-default);
}
.cell:hover {
	background-color: var(--cell-color-hover);
}
.cell-open {
	background-color: var(--cell-color-open);
	font-size: 35px;
	text-align: center;
	line-height: 50px;
}
.cell-open:hover {
	background-color: var(--cell-color-open);
}
.cell-flag {
	background-image: url("/flag.svg");
	background-size: 25px;
	background-repeat: no-repeat;
	background-position: center;
}
.cell-flag:hover {
	background-color: var(--cell-color-default);
}
.cell-mine {
	background-image: url("/mine.svg");
	background-size: 25px;
	background-repeat: no-repeat;
	background-position: center;
}
.cell-wrong-flag {
	background-image: url("/cross-flag.svg");
	background-size: 25px;
	background-repeat: no-repeat;
	background-position: center;
}
.cell-highlight-click {
	--cell-color-default: rgb(112, 157, 115);
	--cell-color-hover: rgb(106, 137, 108);
	--cell-color-open: rgb(170, 221, 165);
}
.cell-highlight-flag {
	--cell-color-default: rgb(78, 113, 160);
	--cell-color-hover: rgb(82, 109, 136);
	--cell-color-open: rgb(137, 184, 219);
}
.cell-n1 {
	color: blue;
}
.cell-n1:before {
	content: "1";
}
.cell-n2 {
	color: green;
}
.cell-n2:before {
	content: "2";
}
.cell-n3 {
	color: red;
}
.cell-n3:before {
	content: "3";
}
.cell-n4 {
	color: darkblue;
}
.cell-n4:before {
	content: "4";
}
.cell-n5 {
	color: brown;
}
.cell-n5:before {
	content: "5";
}
.cell-n6 {
	color: Cyan;
}
.cell-n6:before {
	content: "6";
}
.cell-n7 {
	color: Black;
}
.cell-n7:before {
	content: "7";
}
.cell-n8 {
	color: Grey;
}
.cell-n8:before {
	content: "8";
}
</style>
