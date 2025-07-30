<template>
  <div class="notifications-container">
    <transition-group name="notification" tag="div">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        :class="[
          'notification',
          getNotificationConfig(notification.type).class,
        ]"
      >
        <div class="notification-icon">
          <i :class="getNotificationConfig(notification.type).icon"></i>
        </div>
        <div class="notification-content">
          <div class="notification-message">
            {{ notification.message }}
          </div>
          <div class="notification-time">
            {{ formatTime(notification.timestamp) }}
          </div>
        </div>
        <button
          class="notification-close"
          @click="handleClose(notification.id)"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script>
export default {
  name: 'NotificationsComponent',

  props: {
    notifications: {
      type: Array,
      default: () => [],
    },
  },

  computed: {
    typeConfig() {
      return {
        success: {
          icon: 'fas fa-check-circle',
          class: 'notification-success',
        },
        error: {
          icon: 'fas fa-exclamation-circle',
          class: 'notification-error',
        },
        warning: {
          icon: 'fas fa-exclamation-triangle',
          class: 'notification-warning',
        },
        info: {
          icon: 'fas fa-info-circle',
          class: 'notification-info',
        },
      }
    },
  },

  methods: {
    getNotificationConfig(type) {
      return this.typeConfig[type] || this.typeConfig.info
    },

    handleClose(notificationId) {
      this.$emit('close', notificationId)
    },

    formatTime(timestamp) {
      const date = new Date(timestamp)
      return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    },
  },
}
</script>
