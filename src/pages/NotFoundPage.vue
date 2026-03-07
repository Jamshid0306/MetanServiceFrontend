<template>
  <section class="not-found">
    <div class="not-found-card">
      <p class="not-found-code">404</p>
      <h1 class="not-found-title">Sahifa topilmadi</h1>
      <p class="not-found-description">
        Kechirasiz, siz qidirgan sahifa mavjud emas yoki boshqa manzilga
        ko'chirilgan.
      </p>

      <router-link to="/" class="not-found-button">
        Bosh sahifaga qaytish
      </router-link>
    </div>
  </section>
</template>

<style scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background:
    radial-gradient(circle at 12% 14%, rgba(24, 79, 149, 0.12), transparent 34%),
    radial-gradient(circle at 86% 82%, rgba(15, 43, 102, 0.1), transparent 30%),
    linear-gradient(180deg, #f5f9ff 0%, #eef4ff 100%);
}

.not-found-card {
  width: min(520px, 100%);
  border-radius: 22px;
  border: 1px solid rgba(20, 54, 108, 0.14);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 18px 32px rgba(8, 30, 72, 0.12);
  padding: clamp(1.6rem, 3vw, 2.2rem);
  text-align: center;
}

.not-found-code {
  color: #1a4f95;
  font-size: clamp(2.8rem, 8vw, 4.3rem);
  font-weight: 800;
  letter-spacing: 0.04em;
  line-height: 1;
}

.not-found-title {
  margin-top: 0.9rem;
  color: #14325f;
  font-size: clamp(1.4rem, 4vw, 2rem);
  font-weight: 800;
}

.not-found-description {
  margin-top: 0.6rem;
  color: #486086;
  line-height: 1.65;
  font-size: 0.98rem;
}

.not-found-button {
  margin-top: 1.2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid rgba(20, 54, 108, 0.14);
  background: #143d7a;
  color: #ffffff;
  font-weight: 700;
  font-size: 0.95rem;
  padding: 0.72rem 1.15rem;
  box-shadow: 0 12px 20px rgba(8, 30, 72, 0.2);
  transition:
    transform 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.not-found-button:hover {
  background: #0f2f61;
  transform: translateY(-1px);
  box-shadow: 0 16px 24px rgba(8, 30, 72, 0.24);
}
</style>
