import { Routes } from '@angular/router';
import { MainLayout } from './layouts/main-layout/main-layout';
import { ExchangesPage } from './pages/exchanges/exchanges';
import { HomePage } from './pages/home/home';
import { ImpactPage } from './pages/impact/impact';
import { LoginPage } from './pages/login/login';
import { MaterialDetailPage } from './pages/material-detail/material-detail';
import { PublishPage } from './pages/publish/publish';

export const routes: Routes = [
	{ path: '', redirectTo: 'inicio', pathMatch: 'full' },
	{ path: 'login', component: LoginPage },
	{
		path: '',
		component: MainLayout,
		children: [
			{ path: 'inicio', component: HomePage },
			{ path: 'material/:id', component: MaterialDetailPage },
			{ path: 'publicar', component: PublishPage },
			{ path: 'intercambios', component: ExchangesPage },
			{ path: 'impacto', component: ImpactPage },
		],
	},
	{ path: 'admin', loadComponent: () => import('./pages/admin/admin').then((module) => module.AdminPage) },
];
