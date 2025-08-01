// Stats Cards Component
const StatsCards = {
    props: {
        stats: {
            type: Object,
            default: () => ({
                pendingDeliveries: 0,
                processing: 0,
                completedToday: 0,
                divergences: 0
            })
        },
        loading: {
            type: Boolean,
            default: false
        }
    },
    
    computed: {
        statsData() {
            return [
                {
                    id: 'pending',
                    title: 'Entregas Pendentes',
                    value: this.stats.pendingDeliveries,
                    icon: 'fas fa-truck',
                    type: 'pending'
                },
                {
                    id: 'processing',
                    title: 'Em Conferência',
                    value: this.stats.processing,
                    icon: 'fas fa-boxes',
                    type: 'processing'
                },
                {
                    id: 'completed',
                    title: 'Finalizados da Semana',
                    value: this.stats.completedToday,
                    icon: 'fas fa-check-circle',
                    type: 'completed'
                },
                {
                    id: 'divergences',
                    title: 'Divergências',
                    value: this.stats.divergences,
                    icon: 'fas fa-exclamation-triangle',
                    type: 'alert'
                }
            ];
        }
    },
    
    methods: {
        formatNumber(value) {
            return Number(value).toLocaleString('pt-BR');
        }
    },
    
    template: `
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
    `
}; 