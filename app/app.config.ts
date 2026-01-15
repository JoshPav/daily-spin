export default defineAppConfig({
  ui: {
    radioGroup: {
      slots: {
        item: 'hover:cursor-pointer',
      },
    },
    modal: {
      slots: {
        title: 'text-primary font-extrabold text-2xl',
        content: 'w-full sm:max-w-3xl',
        body: 'w-full',
        close: 'hover:cursor-pointer',
      },
    },
  },
});
