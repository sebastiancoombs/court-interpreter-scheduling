<template>
    <div class="app-outer fill-body" id="app">
        <unified-topbar/>
        <main class="app-content fill-body">
            <router-view/>
        </main>
        <navigation-footer id="footer" />
    </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import UnifiedTopbar from './components/UnifiedTopbar.vue';
import NavigationFooter from './components/NavigationFooter.vue';

import { namespace } from "vuex-class";
import "@/store/modules/common";
const commonState = namespace("Common");

@Component({
    components: {
        UnifiedTopbar,
        NavigationFooter,
    },
})
export default class App extends Vue {
    @commonState.State
    public userName!: string;
}
</script>
