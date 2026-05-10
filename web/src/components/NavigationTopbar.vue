<template>
    <header name="navigation-topbar" class="app-header">

        <nav class="navbar navbar-expand-lg navbar-dark">

            <div class="container-fluid">

                <a class="navbar-brand brand-wordmark"
                    href="https://www.sdcourt.ca.gov"
                    aria-label="Superior Court of California, County of San Diego">
                    <span class="brand-mark" aria-hidden="true">
                        <svg viewBox="0 0 40 40" width="32" height="32" focusable="false">
                            <path d="M20 4 L34 11 V21 C34 28 28 34 20 36 C12 34 6 28 6 21 V11 Z" fill="#C19A36" stroke="#fff" stroke-width="1.5"/>
                            <text x="20" y="25" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="700" fill="#001a3d">CA</text>
                        </svg>
                    </span>
                    <span class="brand-meta d-none d-md-inline-flex">
                        <span class="brand-line-1">Superior Court of California</span>
                        <span class="brand-line-2">County of San Diego</span>
                    </span>
                </a>

                <div class="navbar-brand navbar-text app-name">
                    Court Interpreter Scheduling
                </div>

                <div class="navbar-extra">
                    <div id="app-profile">
                        <div v-if="userName" style="padding-right: rem">
                            <b-row>
                                <b-col>
                                    <b-dropdown id="profileDropdown"
                                                text="Profile"
                                                variant="link"
                                                menu-class="w-10"
                                                right
                                                no-caret
                                                >
                                        <template #button-content >
                                            <span class="topbar-avatar">{{ initials }}</span>
                                            <span class="topbar-username">{{ userName }}</span>
                                            <b-icon icon="chevron-down" class="ml-2 topbar-chev"/>
                                        </template>
                                        <b-dropdown-item @click="logout()">
                                            <b-icon-box-arrow-left class="mr-2"/>Logout
                                        </b-dropdown-item>
                                    </b-dropdown>
                                </b-col>
                                <b-col>
                                    <b-form-select
                                        v-model="userCourtLocation"                                        
                                        @change="ChangeUserLocation()" 
                                        >
                                        <b-form-select-option value=null>
                                            --- Remove Location ---
                                        </b-form-select-option>
                                        <b-form-select-option
                                            v-for="location in sortedCourtLocations" 
                                            :key="location.id"
                                            :value="location.id">
                                                {{location.name}}
                                        </b-form-select-option>

                                    ></b-form-select>
                                    
                                </b-col>                                
                                <b-alert style="margin-top:0.8rem" :variant="alertType" :show="dismissCountDown"  @dismissed="dismissCountDown=0" @dismiss-count-down="countDownChanged">
                                    <b v-if="alertType=='success'">Saved <b-icon-check-square-fill/> </b>
                                    <b v-else>Error <b-icon-exclamation-circle-fill/> </b>
                                </b-alert>
                            </b-row>                          

                        </div>
                    </div>
                </div>

                <button class="navbar-toggler"
                    type="button"
                    data-toggle="collapse"
                    data-target="#navbarNavAltMarkup"
                    aria-controls="navbarNavAltMarkup"
                    aria-expanded="false"
                    aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>
            </div>
            
        </nav>
        
    </header>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import { SessionManager } from "@/components/utils/utils";
import { locationsInfoType } from "@/types/Common/json";
import * as _ from 'underscore';

import { namespace } from "vuex-class";   
import "@/store/modules/common";
const commonState = namespace("Common");

@Component
export default class NavigationTopbar extends Vue {
    
    @commonState.State
    public userName!: string;

    @commonState.State
    public courtLocations!: locationsInfoType[];
    
    @commonState.State
    public userLocation!: locationsInfoType;
    
    @commonState.Action
    UpdateUserLocation!: (newUserLocation: locationsInfoType) => void

    userCourtLocation: number =0;

    dismissCountDown =0
    alertType=""

    @Watch('courtLocations')
    UserNameChange() 
    {
        this.userCourtLocation = this.userLocation?.id
    }

    mounted(){
        this.userCourtLocation = this.userLocation?.id 
    }

    public logout() {
        SessionManager.logout(this.$store);
    }

    public ChangeUserLocation(){
        Vue.nextTick(()=>{
            let data = {
                "locationId": this.userCourtLocation
            }

            if(!data.locationId || (String(data.locationId)=='null') )
                data = {} as {"locationId": number}


            this.$http.put('/user-info/save-location', data).then(res=>{
                // console.log(res)
                this.alertType="success"
                this.dismissCountDown = 1;
                const newUserCourtLocation = (this.courtLocations.filter(loc=>{return loc.id == this.userCourtLocation}))
                if(newUserCourtLocation.length==1)
                    this.UpdateUserLocation(newUserCourtLocation[0])
            },error => {
                this.alertType="danger"
                this.dismissCountDown = 1;
                this.userCourtLocation = this.userLocation?.id
            })
        })
    }

    public countDownChanged(dismissCountDown) {
        this.dismissCountDown = dismissCountDown
    }

    get sortedCourtLocations(){
        return _.sortBy(this.courtLocations,'name')
    }

    get initials(): string {
        if (!this.userName) return '';
        const parts = this.userName.trim().split(/\s+/);
        const first = parts[0]?.[0] || '';
        const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
        return (first + last).toUpperCase();
    }

}
</script>

<style scoped lang="scss">
@import "../styles/common";
.navbar {
  padding-right: 1.5rem;
}
.navbar-brand:not(.logo) {
  flex: 1 1 auto;
}
.navbar-extra {
  display: inline-block;
  flex: 1 1 auto;
  text-align: right;
}
.navbar .navbar-extra {
  display: inline-block;
  flex: 1 1 auto;
  text-align: right;
}

#app-profile {
  color: $gov-white;
}

.alert{
    font-weight: 600;
    height: 2.4rem;
    margin: 0;
    padding: 0.4rem 1rem;
    border-radius: 999px;
}

::v-deep .topbar-avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.16);
    color: #fff;
    font-weight: 600;
    font-size: 0.78rem;
    letter-spacing: 0.01em;
    margin-right: 0.55rem;
}
::v-deep .topbar-username {
    color: #fff;
    font-weight: 500;
}
::v-deep .topbar-chev {
    opacity: 0.65;
    font-size: 0.85rem;
}

.brand-wordmark {
    display: inline-flex;
    align-items: center;
    gap: 0.65rem;
    color: #fff !important;
    text-decoration: none !important;
    padding: 0.1rem 0;
}
.brand-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
}
.brand-meta {
    flex-direction: column;
    line-height: 1.1;
}
.brand-line-1 {
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: rgba(255, 255, 255, 0.85);
}
.brand-line-2 {
    font-size: 0.95rem;
    font-weight: 700;
    letter-spacing: -0.005em;
    color: #fff;
}
.app-name {
    font-weight: 600;
    font-size: 1.1rem;
    letter-spacing: 0.005em;
    color: #fff;
    border-left: 1px solid rgba(255, 255, 255, 0.2);
    padding-left: 1rem;
    margin-left: 0.75rem;
}
</style>