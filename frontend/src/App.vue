<template>
  <v-app style="background-color: black">
    <router-view @error="login" style="z-index: 0"/>
  </v-app>
</template>

<script setup>
const login = () => {
  window.location.href = '/';
};
</script>
