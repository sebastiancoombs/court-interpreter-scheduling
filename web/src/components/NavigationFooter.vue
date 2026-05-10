<template>
  <footer name="navigation-footer">
    <nav  class="navbar navbar-expand-lg navbar-dark">
      <!-- Navbar content -->
      <ul class="navbar-nav">
        <li class="nav-item">
          <a
            class="nav-link"
            href="https://www.sdcourt.ca.gov"
            target="_blank"
            rel="noopener"
            >Disclaimer</a
          >
        </li>
        <li class="nav-item">
          <a class="nav-link" @click="displayTerms()">Terms of Use</a>
        </li>
        <li class="nav-item">
          <a
            class="nav-link"
            href="https://www.sdcourt.ca.gov"
            target="_blank"
            rel="noopener"
            >Privacy Policy</a
          >
        </li>
        <li class="nav-item">
          <a
            class="nav-link"
            href="https://www.courts.ca.gov/policy_accessibility.htm"
            target="_blank"
            rel="noopener"
            >Accessibility</a
          >
        </li>
        <li class="nav-item">
          <a
            class="nav-link"
            href="https://www.courts.ca.gov"
            target="_blank"
            rel="noopener"
            >Judicial Branch of California</a
          >
        </li>
        <li class="nav-item">
          <a name="contact-us" class="nav-link" @click="contactUs = true">Contact Us</a>
        </li>
      </ul>
    </nav>

    <b-modal size="xl" v-model="contactUs" header-class="bg-white">
      <template v-slot:modal-title>
        <h1 class="mb-0 text-primary">General and Technical Inquiries</h1>
      </template>
      <div class="m-3">
        <p>Can't find what you are looking for? Have a technical issue with the Court Interpreter Scheduling application?</p>
        <p>
          Court Interpreter Services is available 7:30 a.m. to 4:30 p.m. Pacific Time, Monday through Friday, excluding court holidays.
        </p>
        <p>
          <strong>Court Interpreter Services</strong><br/>
          Phone: <a href="tel:+16194507100">(619) 450-7100</a><br/>
          Email: <a href="mailto:interpreters@sdcourt.ca.gov">interpreters@sdcourt.ca.gov</a>
        </p>
        <p class="text-muted small mb-0">
          Superior Court of California, County of San Diego — Court Interpreter Services
        </p>
      </div>
      <template v-slot:modal-footer>
        <b-button variant="primary" @click="contactUs = false">Close</b-button>
      </template>
      <template v-slot:modal-header-close>
        <b-button
          variant="outline-dark"
          class="closeButton"
          @click="contactUs = false"
          >&times;</b-button
        >
      </template>
    </b-modal>
  </footer>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
@Component
export default class NavigationFooter extends Vue {
  contactUs = false;
  mounted() {
    this.contactUs = false;
  }

  public displayTerms() {
    this.$router.push({ name: "terms" });
  }
}
</script>