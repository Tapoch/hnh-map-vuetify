<template>
  <div
    v-if="visible"
    class="context-menu"
    :style="{ left: `${position.x}px`, top: `${position.y}px` }"
    @click.stop
  >
    <slot :data="payload" />
  </div>
</template>

<script setup>
import { onBeforeUnmount, reactive, ref } from "vue";

const visible = ref(false);
const payload = ref(null);
const position = reactive({ x: 0, y: 0 });

const close = () => {
  visible.value = false;
};

const open = (event, data) => {
  if (event?.preventDefault) {
    event.preventDefault();
  }
  payload.value = data;
  position.x = event?.clientX || 0;
  position.y = event?.clientY || 0;
  visible.value = true;
};

const onGlobalClick = () => close();

document.addEventListener("click", onGlobalClick);

onBeforeUnmount(() => {
  document.removeEventListener("click", onGlobalClick);
});

defineExpose({ open, close });
</script>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 2000;
  background: #2f2f2f;
  color: white;
  border-radius: 6px;
  min-width: 180px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
  overflow: hidden;
}
.context-menu ::deep(a) {
  display: block;
  padding: 10px 12px;
  color: white;
  text-decoration: none;
  font-size: 13px;
}
.context-menu ::deep(a):hover {
  background: rgba(255, 255, 255, 0.1);
}
.context-menu ul {
  margin: 0;
  padding: 0;
  list-style: none;
}
.context-menu li {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.context-menu li:last-child {
  border-bottom: none;
}
</style>
