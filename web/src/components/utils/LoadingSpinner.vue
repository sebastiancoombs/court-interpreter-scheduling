<template>
    <div v-if="!inline" class="cis-skeleton-card" role="status" aria-live="polite">
        <span class="cis-skel cis-skel--title"/>
        <span class="cis-skel cis-skel--row" style="width: 92%;"/>
        <span class="cis-skel cis-skel--row" style="width: 78%;"/>
        <div class="cis-skel-grid">
            <span class="cis-skel" style="height: 3rem;"/>
            <span class="cis-skel" style="height: 3rem;"/>
            <span class="cis-skel" style="height: 3rem;"/>
        </div>
        <span class="cis-skel cis-skel--row" style="width: 64%;"/>
        <span class="cis-skel cis-skel--row" style="width: 88%;"/>
        <span class="sr-only">{{waitingText || 'Loading'}}</span>
    </div>
    <div v-else class="cis-skel cis-skel--row" style="width: 8rem; display: inline-block;" :aria-label="waitingText || 'Loading'"/>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator';
@Component
export default class LoadingSpinner extends Vue {
    @Prop({ required: true })
    waitingText!: string;

    @Prop({ required: false })
    inline!: boolean;

    @Prop({ required: false, default:"#000" })
    color!: string;
}
</script>
