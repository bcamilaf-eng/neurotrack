// Las pruebas usan UTC para que los días de calendario no dependan de la zona horaria de la máquina.
module.exports = async () => {
  process.env.TZ = 'UTC';
};
