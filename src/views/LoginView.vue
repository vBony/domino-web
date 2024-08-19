<template>
<div class="row">
    <div class="col-12">
        <h1 class="text-center">Login</h1>
        <div class="row justify-content-center">
            <div class="col-12 col-lg-6 col-md-10 col-sm-12 col-xs-12">
                <div class="card p-3 bg-dark" style="border-color: var(--color-border) !important">
                    <form @submit.prevent="login()">
                        <div class="mb-3">
                            <label for="username" class="form-label text-light">Nome de usuário</label>
                            <input 
                                type="text" 
                                class="form-control focus-ring focus-ring-secondary bg-transparent text-light" 
                                id="username" 
                                aria-describedby="username"
                                name="username"
                                v-model="user.nickname"
                                :class="error != null ? 'is-invalid' : ''"
                            >
                            <div v-if="error" id="usernameValidation" class="invalid-feedback">{{ error }}</div>
                        </div>
                        <div class="mb-3">
                            <label for="exampleInputPassword1" class="form-label text-light color">Senha</label>
                            <input 
                                type="password" 
                                class="form-control focus-ring focus-ring-secondary bg-transparent text-light"
                                :class="error != null ? 'is-invalid' : ''"  
                                id="exampleInputPassword1"
                                v-model="user.password"
                            >
                            <div v-if="error" id="passwordValidation" class="invalid-feedback">{{ error }}</div>
                        </div>
                        <button type="submit" class="btn btn-primary">Entrar</button>
                    </form>
                </div>
            </div>
        </div>
    </div>
</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import req from '../helpers/http'

const SERVER_URL = import.meta.env.VITE_SERVER_URL

const App = defineComponent({
    data() {
        return {
            user: {
                nickname: null,
                password: null
            },
            error: null
        }
    },

    methods: {
        login(){
            req.post(SERVER_URL+'/auth', this.user)
            .then((response) => {
                localStorage.setItem("dmno", response.data.token);
                this.$router.push('/play')
            })
            .catch((reason) => {
                if(reason.response.data.errors){
                    this.error = reason.response.data.errors[0].message
                }
            })
        }
    }
})

export default App
</script>