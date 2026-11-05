// Pin the zone so date tests catch toISOString() regressions (UTC+7 shifts the day before 07:00).
module.exports = async () => {
  process.env.TZ = 'Asia/Ho_Chi_Minh';
};
