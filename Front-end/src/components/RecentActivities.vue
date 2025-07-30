<template>
  <div class="recent-activities">
    <div class="section-header">
      <h2>Atividades Recentes</h2>
      <button class="btn view-all-btn" @click="handleViewAll">Ver Todas</button>
    </div>

    <div class="activities-list">
      <!-- Loading state -->
      <div v-if="loading" class="activity-item">
        <div class="activity-icon">
          <i class="fas fa-spinner fa-spin"></i>
        </div>
        <div class="activity-details">
          <h4>Carregando atividades...</h4>
          <p>Por favor, aguarde</p>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="activities.length === 0" class="activity-item">
        <div class="activity-icon">
          <i class="fas fa-info-circle"></i>
        </div>
        <div class="activity-details">
          <h4>Nenhuma atividade recente</h4>
          <p>Não há atividades para exibir no momento</p>
        </div>
      </div>

      <!-- Activities list -->
      <div
        v-else
        v-for="activity in activities"
        :key="activity.id"
        class="activity-item"
      >
        <div :class="['activity-icon', activityIconConfig[activity.type]]">
          <i :class="getActivityIcon(activity.type)"></i>
        </div>
        <div class="activity-details">
          <h4>{{ activity.title }}</h4>
          <p>{{ activity.description }}</p>
          <span class="activity-time">{{ activity.time }}</span>
        </div>
        <div class="activity-status">
          <span
            :class="['status-badge', getStatusBadge(activity.status).class]"
          >
            {{ getStatusBadge(activity.status).label }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RecentActivities',

  props: {
    activities: {
      type: Array,
      default: () => [],
    },
    loading: {
      type: Boolean,
      default: false,
    },
  },

  computed: {
    statusConfig() {
      return {
        success: {
          class: 'success',
          label: 'Conferido',
        },
        warning: {
          class: 'warning',
          label: 'Pendente',
        },
        danger: {
          class: 'danger',
          label: 'Revisar',
        },
      }
    },

    activityIconConfig() {
      return {
        received: 'received',
        pending: 'pending',
        divergence: 'divergence',
        completed: 'completed',
      }
    },
  },

  methods: {
    getStatusBadge(status) {
      return (
        this.statusConfig[status] || {
          class: 'secondary',
          label: 'Desconhecido',
        }
      )
    },

    getActivityIcon(type) {
      const icons = {
        received: 'fas fa-arrow-down',
        pending: 'fas fa-clock',
        divergence: 'fas fa-exclamation-circle',
        completed: 'fas fa-check',
      }
      return icons[type] || 'fas fa-info'
    },

    handleViewAll() {
      console.log('Ver todas as atividades')
      // Implementar navegação para página de atividades
    },
  },
}
</script>
