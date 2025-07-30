<template>
  <div class="stats-grid">
    <div
      v-for="stat in statsData"
      :key="stat.id"
      :class="['stat-card', stat.type]"
    >
      <div class="stat-icon">
        <i v-if="!loading" :class="stat.icon"></i>
        <i v-else class="fas fa-spinner fa-spin"></i>
      </div>
      <div class="stat-details">
        <h3>{{ loading ? '...' : formatNumber(stat.value) }}</h3>
        <p>{{ stat.title }}</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StatsCards',

  props: {
    stats: {
      type: Object,
      default: () => ({
        pendingDeliveries: 0,
        processing: 0,
        completedToday: 0,
        divergences: 0,
      }),
    },
    loading: {
      type: Boolean,
      default: false,
    },
  },

  computed: {
    statsData() {
      return [
        {
          id: 'solicitacoes',
          title: 'Solicitações',
          value: this.stats.solicitacoes,
          icon: 'fa-solid fa-hourglass-half',
          type: 'pending',
        },
        {
          id: 'agendamentos',
          title: 'Agendamentos',
          value: this.stats.agendamentos,
          icon: 'fa-solid fa-truck',
          type: 'processing',
        },
        {
          id: 'conferencia',
          title: 'Conferência',
          value: this.stats.conferencia,
          icon: 'fa-solid fa-magnifying-glass',
          type: 'completed',
        },
        {
          id: 'tratativa',
          title: 'Tratativa',
          value: this.stats.tratativa,
          icon: 'fas fa-exclamation-triangle',
          type: 'alert',
        },
      ]
    },
  },

  methods: {
    formatNumber(value) {
      return Number(value).toLocaleString('pt-BR')
    },
  },
}
</script>
