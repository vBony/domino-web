import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import req from '@/helpers/http'
import SignUpView from '@/views/SignUpView.vue'
import PartidaAndamentoView from '@/views/PartidaAndamentoView.vue'

/**
 * Autentica e armazena os dados do usuário logado
 */
async function setUserDataAuthenticate(): Promise<boolean> {
	const SERVER_URL = import.meta.env.VITE_SERVER_URL
	try {
		const response = await req.get(SERVER_URL+'/auth/user')

		let data = JSON.stringify(response.data)
		localStorage.setItem("dmno_user", data);

		return true
	}catch (error) {
		return false
	}
}

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: '/',
			name: 'home',
			component: HomeView
		},
		{
			path: '/login',
			name: 'login',
			component: LoginView
		},
		{
			path: '/signup',
			name: 'signup',
			component: SignUpView
		},
		{
			path: '/partida-andamento',
			name: 'signup',
			component: PartidaAndamentoView
		},
		{
			path: '/about',
			name: 'about',
			// route level code-splitting
			// this generates a separate chunk (About.[hash].js) for this route
			// which is lazy-loaded when the route is visited.
			component: () => import('../views/AboutView.vue')
		},
		{
			path: '/play',
			name: 'play',
			beforeEnter: async (to, from) => {
				const auth = await setUserDataAuthenticate()

				if(!auth){
					return '/login'
				}
			},
			component: () => import('../views/PlayView.vue')
		}
	]
})

export default router
