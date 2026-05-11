<template>
    <div class="cis-empty-state">
        <div class="cis-empty-state__icon" v-if="icon" aria-hidden="true">
            <i :class="icon"/>
        </div>
        <p class="cis-empty-state__title">{{ title }}</p>
        <p class="cis-empty-state__body" v-if="message">{{ message }}</p>
        <slot/>
    </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator'

@Component
export default class EmptyState extends Vue {
    @Prop({ default: 'fa fa-inbox' }) icon!: string
    @Prop({ default: 'Nothing here yet' }) title!: string
    @Prop({ default: '' }) message!: string
}
</script>
