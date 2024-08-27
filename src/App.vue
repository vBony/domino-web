<template>
	<div class="w100">
		<nav class="navbar navbar-expand-lg bg-body-tertiary">
			<div class="container-fluid">
				<a class="navbar-brand" href="#">dmno</a>
				<button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNavDropdown" aria-controls="navbarNavDropdown" aria-expanded="false" aria-label="Toggle navigation">
					<span class="navbar-toggler-icon"></span>
				</button>
				<div class="collapse navbar-collapse" id="navbarNavDropdown">
					<ul class="navbar-nav me-auto mb-2 mb-lg-0">
						<li class="nav-item">
							<RouterLink to="/" class="nav-link active" aria-current="page">Home</RouterLink>
						</li>
						<li class="nav-item">
							<a class="nav-link" href="#">Features</a>
						</li>
						<li class="nav-item">
							<a class="nav-link" href="#">Pricing</a>
						</li>
					</ul>

					<div class="d-flex">
						<RouterLink to="/login" class="btn btn-success">Jogar</RouterLink>
					</div>
				</div>
			</div>
		</nav>
	</div>

	<main class="py-4">
		<RouterView />
	</main>

</template>

<script setup lang="ts">
</script>
