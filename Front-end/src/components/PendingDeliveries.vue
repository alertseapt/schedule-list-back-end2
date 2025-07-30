<template>
  <div class="pending-deliveries">
    <div class="section-header">
      <h2>Entregas Agendadas</h2>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nº NF-e</th>
            <th>Fornecedor</th>
            <th>Volumes</th>
            <th>Data Agendada</th>
            <th>Estoque</th>
            <th>Status</th>
            <th>Mais informações</th>
          </tr>
        </thead>
        <tbody>
          <!-- Loading state -->
          <tr v-if="loading">
            <td colspan="7" style="text-align: center; padding: 20px">
              <i class="fas fa-spinner fa-spin"></i>
              Carregando entregas agendadas...
            </td>
          </tr>

          <!-- Empty state -->
          <tr v-else-if="deliveries.length === 0">
            <td colspan="7" style="text-align: center; padding: 20px">
              <i class="fas fa-inbox"></i>
              Nenhuma entrega agendada
            </td>
          </tr>

          <!-- Deliveries list -->
          <tr v-else v-for="delivery in deliveries" :key="delivery.id">
            <td>{{ delivery.nfe || delivery.order || 'N/A' }}</td>
            <td>{{ delivery.supplier }}</td>
            <td>{{ delivery.volumes || delivery.quantity || 'N/A' }}</td>
            <td>
              {{ delivery.scheduledDate || delivery.scheduledTime || 'N/A' }}
            </td>
            <td>{{ delivery.warehouse || 'Principal' }}</td>
            <td>
              <span
                :class="['status-badge', getStatusBadge(delivery.status).class]"
              >
                {{ getStatusBadge(delivery.status).label }}
              </span>
            </td>
            <td>
              <button
                class="btn btn-icon btn-info"
                title="Mais informações"
                @click="handleAction('view', delivery.id)"
              >
                <i class="fas fa-info-circle"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PendingDeliveries',

  props: {
    deliveries: {
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
        scheduled: {
          class: 'warning',
          label: 'Agendado',
        },
        on_way: {
          class: 'info',
          label: 'A Caminho',
        },
        processing: {
          class: 'secondary',
          label: 'Processando',
        },
        completed: {
          class: 'success',
          label: 'Concluído',
        },
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

    handleAction(action, deliveryId) {
      this.$emit('action', action, deliveryId)
    },

    getActionButtons() {
      // Método mantido para compatibilidade, mas agora usamos apenas um botão
      return [
        {
          action: 'view',
          icon: 'fas fa-info-circle',
          title: 'Mais informações',
          class: 'btn-info',
        },
      ]
    },
  },
}
</script>
