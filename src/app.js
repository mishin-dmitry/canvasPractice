import './styles.scss';
import { getChartData } from './data';
import { chart } from './chart';

const tgChart = chart(document.getElementById('chart'), getChartData());
tgChart.init();