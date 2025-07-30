<template>
  <aside :class="sidebarClasses">
    <div class="sidebar-logo expanded">
      <div class="logo-shine logo-box">
        <img :src="logoUrl" alt="Logo" class="sidebar-logo-img" />
      </div>
      <div class="logo-texts">
        <div class="logo-title">Recebimento</div>
      </div>
    </div>

    <nav class="sidebar-menu">
      <div
        v-for="item in menuItems"
        :key="item.id"
        :class="['menu-item', { active: isMenuActive(item.id) }]"
      >
        <!-- Menu principal -->
        <div @click="handleMenuClick(item.id)" class="menu-main">
          <div class="icon-container">
            <i :class="item.icon"></i>
          </div>
          <span class="menu-label">{{ item.label }}</span>
        </div>
      </div>
    </nav>

    <!-- User Info -->
    <div class="user-info">
      <div class="user-avatar">
        <i class="fas fa-user"></i>
      </div>
      <div class="user-details">
        <div class="user-name">{{ user.name || user.user || 'Usuário' }}</div>
        <div class="user-role">{{ userRole }}</div>
      </div>
      <button class="logout-btn" @click="handleLogout" title="Sair">
        <i class="fas fa-sign-out-alt"></i>
      </button>
    </div>
  </aside>
</template>

<script>
import logoImg from '@/assets/images/logo.png'

export default {
  name: 'SidebarComponent',
  props: {
    user: {
      type: Object,
      default: () => ({}),
    },
    activeMenu: {
      type: String,
      default: 'dashboard',
    },
  },

  data() {
    return {
      expanded: true,
      menuItems: [
        {
          id: 'dashboard',
          icon: 'fas fa-home',
          label: 'Principal',
          submenu: [],
        },
        {
          id: 'agendamento',
          icon: 'fas fa-calendar-alt',
          label: 'Agendamentos',
          submenu: [],
        },
        {
          id: 'configuracoes',
          icon: 'fas fa-cog',
          label: 'Configurações',
          submenu: [],
        },
      ],
    }
  },

  computed: {
    sidebarClasses() {
      return {
        sidebar: true,
        'sidebar-expanded': this.expanded,
      }
    },

    logoUrl() {
      return logoImg
    },

    userRole() {
      if (!this.user) return 'Usuário'

      switch (this.user.level_access) {
        case 0:
          return 'Desenvolvedor'
        case 1:
          return 'Usuário'
        case 2:
          return 'Administrador'
        case 3:
          return 'Gerente'
        default:
          return 'Usuário'
      }
    },
  },

  methods: {
    handleMenuClick(menuId) {
      this.$emit('menu-click', menuId)
    },

    handleLogout() {
      this.$emit('logout')
    },

    isMenuActive(menuId) {
      return this.activeMenu === menuId
    },
  },
}
</script>
