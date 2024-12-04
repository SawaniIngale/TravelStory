export const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

export const getInitials = (name)=>{
    if(!name) return "";

    const words = name.split(" ");
    let initials = "";

    for (let i = 0; i < Math.min(words.length,2); i++) {
        initials += words[i][0];
    }

    return initials.toUpperCase(); 
};

export const getEmptyCardMessage = (filterType) =>{
    switch(filterType){
        case "search":
            return `No story found matching your search!`;
        case "date":
            return `No story found matching your Date range!`;

        default:
            return `Welcome to your personal Travel Journal. Click on the Add button(right bottom corner) to start journaling your travel memories!`;
    }
}