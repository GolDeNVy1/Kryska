const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Рассказывает что я умею')
        .setDMPermission(false),

    async execute(interaction) {
        await interaction.deferReply();

        const helpEmbed = new EmbedBuilder()
            .setColor(COLORS.WHITE)
            .setTitle('😎 Хэй, давай расскажу что умею!')
            .setDescription('Я Крыска <3 — Я умею играть на электронной балалайке)\nСписок моих команд:')
            .addFields(
                { name: '/help', value: 'Помощь' },
                { name: '/play', value: 'Начну играть музыку' },
                { name: '/play-ext', value: 'Усовершенствованная команда — выбери платформу' },
                { name: '/stop', value: 'Перестану играть музыку' },
                { name: '/skip', value: 'Пропущу нелюбимую песню' },
                { name: '/previous', value: 'Вернусь к предыдущему треку' },
                { name: '/loop', value: 'Буду играть одно и то же (песню или очередь)' },
                { name: '/empty', value: 'Освобожу очередь для новых треков' },
                { name: '/pauseresu', value: 'Остановлюсь и продолжу когда захочешь' },
                { name: '/queue', value: 'Покажу что в репертуаре' },
                { name: '/shuffle', value: 'Буду играть песни в разнобой' },
                { name: '/volume', value: 'Буду играть громче или тише' },
                { name: '/insert', value: 'Вставлю песню следующей в репертуар' },
                { name: '/lyrics', value: 'Показать текст текущей песни (караоке)' },
                { name: '/nodes', value: 'Показать статистику Lavalink нод' },
            )
            .setFooter({
                text: `Запустил: ${interaction.user.displayName}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
            });

        await interaction.followUp({ embeds: [helpEmbed] });
    },
};
