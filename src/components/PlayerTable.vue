<template>
    <div class="d-flex flex-column align-items-center justify-content-center mb-4">
        <div class="text-center">
            <img :src="'https://picsum.photos/200/300?random='+id" style="border-radius: 100%;width:55px;height: 55px;">
        </div>
        <span>{{ nickname }}</span>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

const SERVER_URL = import.meta.env.VITE_SERVER_URL

const App = defineComponent({
    props: {
        id: null,
        nickname: null
    }
})

export default App
</script>